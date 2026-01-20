import type {DirNode, json_dir_tree} from "./build_dir_tree.ts";
import {processTag} from "./build_tags_page.ts";
import path from "node:path";
import type {Dir} from "node:fs";

export type file_details = {
    name: string;
    directory: string;
}
export type rule = {
    name: string,
    description: string,
    apply: (input: string, file_details:file_details, directory_tree_node:DirNode) => string
}
export class SharedState {
    public static tag_class_map: Map<string, string> = new Map();
    public static dir_tree: DirNode| null = null;
    public static vault_path: string = "";
    public static graph_links_map: Map<string, Array<{target:string, exists:boolean}>>
    public static absolute_paths: Map<string, string> = new Map();
    public static link_map: {[key:string]:Array<{
            node: DirNode,
            type: "outgoing" | "incoming"
        }>} = {};
}
const rules:Array<rule> = [
    {
        name: "Add Layout",
        description: "Adds the layout frontmatter to the markdown file.",
        apply: (input:string, file_details:file_details, directory_tree_node:DirNode)=>{
            // This means there is already frontmatter present, we don't want to change that too much, however we do want to ensure the layout is set
            if(input.startsWith("---")){
                return input.replace("---", `---\nlayout: ./src/layouts/Layout.astro\noriginal_file_path: ${directory_tree_node.getDirectory()}/${directory_tree_node.getName()}\n`);
            }
            return `---\nlayout: ./src/layouts/Layout.astro\noriginal_file_path: ${directory_tree_node.getDirectory()}/${directory_tree_node.getName()}\n---\n\n${input}`;
        }
    },
    {
        name: "Add Title",
        description: "Adds the file_name as # after frontmatter.",
        apply: (input:string, file_details:file_details)=>{
            // Add file_details.name as title after the closing --- frontmatter tags
            // Get the name without extension
            const name_without_extension = file_details.name.replace(/\.[^/.]+$/, "");

            return input.replace(/(---)(.*?)(---)/s, `$1$2$3\n # ${name_without_extension}\n`);
        }
    },
    {
        name: "Replace all internal links",
        description: "Replaces all internal links identified by [[link|text]] with [text](/path) — outputs are vault-root-relative (vault path removed) and do not force .md extensions. Also records graph links into SharedState.graph_links_map and registers cleaned absolute links into SharedState.absolute_paths.",
        apply: (input: string, file_details: file_details, directory_tree_node:DirNode) => {
            return input.replace(/\[\[([^\|\]]+)(\|([^\]]+))?\]\]/g, (match, p1, p2, p3) => {
                let link_target = p1.trim();
                // Remove trailing \ from the link_target
                link_target = link_target.replace(/\\$/, "");
                let link_text = p3 ? p3.trim() : link_target;
                let resolved_path:null | DirNode = null;
                if(link_target.startsWith("/") || link_target.startsWith("./")){
                    try{
                        if(!directory_tree_node.getParent()) throw new Error("Could not resolve path, directory tree node has no parent.");
                        resolved_path = directory_tree_node.getParent().resolveRelativePath(link_target);
                    }
                    catch(e){
                        console.log("Could not resolve path, falling back to vault search")
                    }
                }

                // Search the vault for the file
                if(!resolved_path){
                    let filename_in_link_target = path.basename(link_target);
                    let found_nodes = directory_tree_node.findFileInVault(filename_in_link_target);
                    if(found_nodes.length == 0){
                        found_nodes = directory_tree_node.findFileInVault(`${link_target.replaceAll("\\", "")}`);
                    }
                    console.log(`Found ${found_nodes.length} results for ${filename_in_link_target}, ${link_target} in vault`);
                    // If there are more than 1 results, we should use the one "closer" to the current file
                    if(found_nodes.length > 1){
                        resolved_path = found_nodes.reduce((closest, node) => {
                            return Math.abs(node.getDirectory().length - file_details.directory.length) < Math.abs(closest.getDirectory().length - file_details.directory.length) ? node : closest;
                        });
                    }
                    else if(found_nodes.length === 1){
                        resolved_path = found_nodes[0];
                    }
                    else{
                        console.log(`Could not find file with name: ${filename_in_link_target} in vault`);
                    }
                }
                if(!resolved_path) return `[${link_text}](${encodeURI(link_target)}) broken link!`;
                // Set link_target to the name of the file without extension
                link_target = resolved_path.getName()
                if(link_target.endsWith(".md")){
                    link_target = path.basename(link_target, path.extname(link_target));
                }
                if(!SharedState.link_map[directory_tree_node.getDirectory() + "/" + directory_tree_node.getName()]){
                    SharedState.link_map[directory_tree_node.getDirectory() + "/" + directory_tree_node.getName()] = []
                }
                if(resolved_path.getName().endsWith(".md")){
                    SharedState.link_map[directory_tree_node.getDirectory() + "/" + directory_tree_node.getName()].push({
                        node: resolved_path,
                        type: "outgoing"
                    });
                    // Add this file as incoming link to the resolved_path
                    if(!SharedState.link_map[resolved_path.getDirectory() + "/" + resolved_path.getName()]){
                        SharedState.link_map[resolved_path.getDirectory() + "/" + resolved_path.getName()] = []
                    }
                    SharedState.link_map[resolved_path.getDirectory() + "/" + resolved_path.getName()].push({
                        node: directory_tree_node,
                        type: "incoming"
                    })
                }
                return `[${link_text}](${encodeURI(`${resolved_path.getDirectory()}/${link_target}`)})`;
            });
        }
    },
    {
        name: "Convert Tags",
        description: "Converts all tags identified by #tag to <div class=\"tag\">#tag</div>.",
        apply: (input: string, file_details: file_details, node: DirNode) => {

            const placeholders: string[] = [];

            // 1. Alles maskieren, was KEINE Tags enthalten darf
            let masked = input.replace(
                /```[\s\S]*?```|`[^`]*`|\[\[[\s\S]*?\]\]|\[[^\]]*?\]\([^)]+\)/g,
                match => {
                    const id = placeholders.length;
                    placeholders.push(match);
                    return `@@MASK_${id}@@`;
                }
            );

            // 2. Jetzt NUR noch echte Tags ersetzen
            masked = masked.replace(/(?<!\w)#([a-zA-Z0-9_]+)/g, (match, tag) => {

                let assigned_class: string;

                if (SharedState.tag_class_map.has(tag)) {
                    assigned_class = SharedState.tag_class_map.get(tag)!;
                } else {
                    const num = Math.floor(Math.random() * 4) + 1;
                    assigned_class = `${num}`;
                    SharedState.tag_class_map.set(tag, assigned_class);
                }

                processTag(tag, node);

                return `<div class='tag tag-${assigned_class}'>#${tag}</div>`;
            });

            // 3. Maskierten Inhalt wieder einsetzen
            return masked.replace(/@@MASK_(\d+)@@/g, (_, i) => placeholders[Number(i)]);
        }
    },
    {
        name: "Numbered List",
        description: "ToDo",
        apply: (input: string, file_details: file_details) => {
            //ToDo
            return input;
        }
    },
    {
        name: "Excalidraw",
        description: "ToDo",
        apply: (input: string, file_details: file_details) => {
            //Maybe replace .excalidraw with .excalidraw.svg
            return input;
        }
    },
    {
        name: "Show the File Properties",
        description: "Shows the frontmatter Properties as Table",
        apply: (input: string, file_details: file_details) => {
            if (input.startsWith("---")) {
                //ToDo
            }
            return input;
        }
    },
    {
        name: "Escape import statements in MDX",
        description: "Escapes import statements in MDX files to prevent Astro build errors.",
        apply: (input:string, file_details:file_details)=>{
            input = input.replace(/^(import\s.+)$/gm, (match, p1) => {
                return `<div/>import`;
            });
            input =  input.replace(/^(export\s.+)$/gm, (match, p1) => {
                return `<div/>export`;
            });
            return input;
        }
    }
]
export default rules;