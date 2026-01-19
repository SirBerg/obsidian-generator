import * as fs from "node:fs";
import * as path from "node:path";
import rules, {SharedState} from "./markdown_rules.ts";
import {w} from "magicast/dist/types-CQa2aD_O";
const VAULT_PATH = "/home/berg/Documents/Schule";

/*
* Applies all rules defined in markdown_rules to the markdown file at filePath.
* */
export function applyMarkdownPreprocessingRules(filePath:string, dirPath:string){
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const fileStats = fs.statSync(filePath);
    const file_details = {
        name: path.basename(filePath),
        directory: path.dirname(filePath)
    }
    let out_string = fileContent;
    for(const rule of rules){
        console.log(`Applying rule: ${rule.name}\nDescription: ${rule.description}`);
        out_string = rule.apply(out_string, file_details);
    }
    // Write the processed content back to the file as a .mdx
    const path_without_vault = filePath.replace(VAULT_PATH, "");
    const output_path = path.join(".","src", "pages", path_without_vault);
    const dir_path = path.join(".","src", "pages", dirPath.replace(VAULT_PATH, ""));
    console.log("will write to:", output_path, dir_path);

    try{
        fs.mkdirSync(dir_path, { recursive: true });
        console.log("Created directory:", dir_path);
    }
    catch(e){
        console.error(e);
    }

    // Create and write to the output file
    fs.writeFileSync(output_path.replace(/\.md$/, ".mdx"), out_string, "utf-8");

    // Also IF the filename matches the directory name, create a copy of this file as index.mdx in that directory
    if(path.basename(filePath, ".md") === path.basename(path.dirname(filePath))){
        const index_output_path = path.join(dir_path, "index.mdx");
        fs.writeFileSync(index_output_path, out_string, "utf-8");
        console.log("Created index file at:", index_output_path);
    }
}

class MarkdownGraph{
    public static links_map: Map<string, Set<string>> = new Map();
}
/*
* Extracts and normalizes links and tags from the markdown file content and stores those relationships in a map
* */
export function buildMarkdownGraph(fileContent:string){

}
//applyMarkdownPreprocessingRules("test")

/*
* Runs the markdown preprocessing for each file defined at VAULT_PATH
* */
function processVault(vaultPath:string){
    const files = fs.readdirSync(vaultPath);

    for(const file of files){
        if(file.startsWith(".")) continue;
        // Check if the file is a markdown file OR a directory
        const fullPath = path.join(vaultPath, file);
        console.log(file, fullPath)
        const stat = fs.statSync(fullPath);
        if(stat.isFile() && path.extname(file) === ".md"){
            console.log(`Processing file: ${fullPath}`);
            applyMarkdownPreprocessingRules(fullPath, vaultPath);
        } else if(stat.isDirectory()){
            // Recursively process the directory
            processVault(fullPath);
        }
        else if(stat.isFile() && path.extname(file) !== ".md"){
            // Everything else is copied as is
            const path_without_vault = fullPath.replace(VAULT_PATH, "");
            const output_path = path.join(".","public", "", path_without_vault);
            const dir_path = path.dirname(output_path);
            try{
                fs.mkdirSync(dir_path, { recursive: true });
                console.log("Created directory for non-md file:", dir_path);
            }
            catch(e){
                console.error(e);
            }
            fs.copyFileSync(fullPath, output_path);
            console.log(`Copied non-markdown file: ${fullPath} to ${output_path}`);
        }
    }
}
function scanDirectoryForFiles(dirPath:string){
    const files = fs.readdirSync(dirPath);

    for(const file of files){
        if(file.startsWith(".")) continue;
        const fullPath = path.join(dirPath, file);
        const stat = fs.statSync(fullPath);
        if(stat.isFile()){
            // Store the file details in the SharedState
            SharedState.all_files.set(fullPath, { name: file, directory: dirPath.replace(VAULT_PATH, "") });
        } else if(stat.isDirectory()){
            // Recursively scan the directory
            scanDirectoryForFiles(fullPath);
        }
    }
}


function generate(){
    SharedState.vault_path = VAULT_PATH;
    // First, build a map of all files in the vault
    scanDirectoryForFiles(VAULT_PATH)

    // Then process those files and apply the rules in markdown_rules
    processVault(VAULT_PATH);

    // Generate a directory_tree.json file representing the vault structure in src/pages out of the SharedState.all_files map
    type DirectoryNode = {
        type: "file" | "directory",
        name?: string,
        children?: {[key:string]: DirectoryNode}
    }
    const directory_tree: {[key:string]: DirectoryNode} = {};
    for(const [filePath, fileDetails] of SharedState.all_files){
        const relativePath = filePath.replace(VAULT_PATH, "");
        const parts = relativePath.split(path.sep).filter(part => part.length > 0);
        let currentLevel = directory_tree;
        for(let i = 0; i < parts.length; i++){
            const part = parts[i];
            if(i === parts.length - 1){
                // It's a file
                currentLevel[part] = { type: "file", name: fileDetails.name };
            } else{
                // It's a directory
                if(!currentLevel[part]){
                    currentLevel[part] = { type: "directory", children: {} };
                }
                currentLevel = currentLevel[part].children;
            }
        }
    }
    console.log("Directory tree:", JSON.stringify(directory_tree, null, 2));
    const output_path = path.join(".","src", "pages", "directory_tree.json");
    fs.writeFileSync(output_path, JSON.stringify(directory_tree, null, 2), "utf-8");
}
generate();