import * as fs from "node:fs";
import path from "node:path";
export type json_dir_tree = {
    name: string,
    directory: string,
    type: "file" | "directory",
    children: json_dir_tree[] | null
}
export class DirNode{
    private type:  "file" | "directory";
    private children: DirNode[] = [];
    private name: string;
    private parent: DirNode | null = null;
    private directoryPath: string = "";
    constructor(name:string, type: "file" | "directory", directory:string, parent: DirNode | null = null){
        this.name = name;
        this.type = type;
        this.parent = parent;
        this.directoryPath = directory;
    }
    public addChildren(...children:DirNode[]){
        this.children.push(...children);
    }
    public getChildren(){
        return this.children;
    }
    public getDirectory(){
        return this.directoryPath;
    }
    public getParent(){
        return this.parent;
    }
    public getName(){
        return this.name;
    }
    public getType(){
        return this.type;
    }
    public findFileInVault(name:string):Array<DirNode>{
        const root_node = this.getRoot();
        function recurse(node:DirNode):Array<DirNode>{
            // Remove the trailing .ttt fileextensions
            const name_without_extension = node.name.replace(/\.[^/.]+$/, "");
            if(node.type === "file" && name === name_without_extension) return [node];
            if(node.type === "file" && name === node.name) return [node];
            let return_array:Array<DirNode> = [];
            for(const child of node.getChildren()){
                const found_files = recurse(child);
                if(found_files.length > 0){
                    return_array.push(...found_files);
                }
            }
            return return_array;
        }
        return recurse(root_node) ?? [];
    }
    public getRoot():DirNode{
        let current_node:DirNode = this;
        while(current_node.parent != null){
            current_node = current_node.parent;
        }
        return current_node;
    }
    /*
    * Resolves an absolute path relative to the directory of this node.
    * It does **not** traverse upwards only downwards, so it would be best to call this from the root node.
    * It also expects to get an absolute path from the vault root.
    * i.e vault_path: /Users/boerg/Documents/Vault
    * expected path: /Folder1/Folder2/File.md
    * */
    public resolveAbsolutePath(path:string):DirNode{
        if(this.type != "directory") throw new Error("Cannot resolve absolute path from a file node.");
        const parts = path.split("/").filter((part)=> part !== "");
        let current_node:DirNode = this;
        for(const part of parts){
            const next_node = current_node.getChildren().find((child)=> child.name === part);
            if(next_node == null) throw new Error(`Could not find child node with name: ${part}`);
            current_node = next_node;
        }
        return current_node;
    }

    /*
    * Resolves a relative path from the directory of this node.
    * It can traverse upwards and downwards.
    * */
    public resolveRelativePath(rel_path:string):DirNode{
        if(rel_path.startsWith("/")) return this.resolveAbsolutePath(rel_path);
        if(rel_path.startsWith("./")) return this.resolveRelativePath(rel_path.replace("./", ""));
        if(!rel_path.startsWith("/") && !rel_path.startsWith("../") && !rel_path.startsWith("./")) return this.resolveAbsolutePath(`/${rel_path}`);
        if(this.parent == null) throw new Error("Cannot resolve relative path that traverses upwards from root node.");

        if(rel_path.startsWith("../")){
            return this.parent.resolveRelativePath(rel_path.replace("../", ""));
        }
        else{
            return this.resolveAbsolutePath(`/${rel_path}`);
        }

    }

    /*
    * Builds a json object of the directory tree structure.
    * The root node is the first argument.
    * The returned object is a json_dir_tree object.
    * */
    public toJson():json_dir_tree{
        function recurse(DirNode:DirNode):json_dir_tree{
            let return_object:json_dir_tree = {
                name: path.basename(DirNode.name),
                directory: DirNode.directoryPath,
                type: DirNode.type,
                children: []
            }
            for(const child of DirNode.getChildren()){
                if(child.type === "directory"){
                    if(return_object.children == null) return_object.children = [];
                    return_object.children.push(recurse(child));
                }
                else{
                    if(return_object.children == null) return_object.children = [];
                    return_object.children.push({
                        name: child.name,
                        directory: child.directoryPath,
                        type: child.type,
                        children: null,
                    });
                }
            }
            return return_object;
        }
        return recurse(this);
    }
}
export function treeFromJSON(json:json_dir_tree, parent:DirNode|null=null):DirNode{
    const root = new DirNode(json.name, json.type, json.directory, parent);
    let children:DirNode[] = [];
    if(json.children){
        for(const child of json.children){
            // Recursevly build the tree from the json object
            if(child.type == "directory" && child.children){
                // Recurse into the directory
                children.push(treeFromJSON(child, root));
            }
            else{
                children.push(new DirNode(child.name, child.type, child.directory, root));
            }
        }
    }
    root.addChildren(...children);
    return root;
}
export function buildDirTree(dir:string, root:DirNode | null = null, vault_path:string):DirNode{
    dir = dir.replace(vault_path, "");
    const files_in_dir = fs.readdirSync(path.join(vault_path, dir));
    console.log("Processing directory:", dir);
    const dir_return_node = new DirNode(path.basename(dir), "directory", dir, root);
    const children = [];
    for(const file of files_in_dir.filter((name)=> !name.startsWith("."))){
        // If the file is a directory, recursively build the tree
        const fullPath = `${dir}/${file}`;
        if(fs.statSync(`${vault_path}/${fullPath}`).isDirectory()){
            children.push(buildDirTree(fullPath, dir_return_node, vault_path));
            continue;
        }
        // Else just push the file as a child node
        children.push(new DirNode(file, "file", dir, dir_return_node));
    }
    dir_return_node.addChildren(...children);
    return dir_return_node;
}

/*
const test_tree = buildDirTree("/Users/boerg/Documents/Main", null, "/Users/boerg/Documents/Main");
let wpug_node = test_tree.findFileInVault("Programmierung");
console.log(wpug_node[0].getDirectory())
 */