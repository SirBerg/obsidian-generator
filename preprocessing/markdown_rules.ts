import type {DirNode} from "./build_dir_tree.ts";

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
}
const rules:Array<rule> = [
    {
        name: "Add Layout",
        description: "Adds the layout frontmatter to the markdown file.",
        apply: (input:string, file_details:file_details)=>{
            // This means there is already frontmatter present, we don't want to change that too much, however we do want to ensure the layout is set
            if(input.startsWith("---")){
                return input.replace("---", `---\nlayout: ./src/layouts/Layout.astro \n`);
            }
            return `---\nlayout: ./src/layouts/Layout.astro \n---\n\n${input}`;
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
                let link_target = p1.trim().replaceAll("\\", "/");
                let link_text = p3 ? p3.trim() : link_target;
                // Check the link target and determine if it is a relative path that we should resolve or just a file in the directory that we are in or that is directly above or below us
                console.log(`Processing internal link: ${link_target} in file: ${file_details.directory}/${file_details.name}`);
                let resolved_path:DirNode|null = null;
                if(link_target.startsWith("/")){
                    // Absolute path from vault root
                    try{
                        resolved_path = directory_tree_node.resolveAbsolutePath(link_target);
                    }
                    catch(e){
                        console.log("Did not find link target absolute path:", link_target);
                    }
                }
                return "";
            });
        }
    },
    {
        name: "Convert Tags",
        description: "Converts all tags identified by #tag to <div class=\"tag\">#tag</div>.",
        apply: (input:string, file_details:file_details)=>{
            return input.replace(/#(\w+)/g, (match, p1) => {
                // Check if we have already assigned a class to this tag
                let assigned_class = null;
                if(SharedState.tag_class_map.has(p1)){
                    assigned_class = SharedState.tag_class_map.get(p1);
                }
                else{
                    // Generate a random number between 1 and 4 for color assignment
                    const num = Math.floor(Math.random() * 4) + 1;
                    assigned_class = `${num}`;
                    SharedState.tag_class_map.set(p1, assigned_class);
                }
                return `<div class="tag tag-${assigned_class}">#${p1}</div>`;
            })
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