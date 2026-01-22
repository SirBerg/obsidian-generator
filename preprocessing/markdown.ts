import * as fs from "node:fs";
import * as path from "node:path";
import rules, {type rule, SharedState} from "./markdown_rules.ts";
import {buildDirTree, DirNode} from "./build_dir_tree.ts";
import {buildTagPage} from "./build_tags_page.ts";
import {link_rules} from "./link_rules.ts";
import { buildDirPage } from "./build_dir_page.ts";

//const VAULT_PATH = "/home/berg/Documents/Schule";
const VAULT_PATH = "vault";

/*
* Applies all rules defined in markdown_rules to the markdown file at filePath.
* */
export function applyMarkdownPreprocessingRules(filePath:string, dirPath:string, ruleset:Array<rule>){
    console.log("Reading file content")
    const fileContent = fs.readFileSync(filePath, "utf-8");
    filePath = filePath.replaceAll("\\", "/");
    console.log("File content read");
    const fileStats = fs.statSync(filePath);
    if(!fileStats.isFile()) throw new Error("File is not a file.");
    const file_details = {
        name: path.basename(filePath),
        directory: path.dirname(filePath)
    }
    let out_string = fileContent;
    if(!SharedState.dir_tree) throw new Error("Directory tree not built yet. Did you forget to call generate()?");
    let directory_node:DirNode | null = null;
    try{
        directory_node = SharedState.dir_tree?.resolveAbsolutePath(filePath.replace(VAULT_PATH, ""));
    }
    catch(e){
        console.log(e.toString());
    }
    if(!directory_node){
        let path_without_src = filePath.replace("src/pages", "")
        // Remove the extension
        path_without_src = path_without_src.replace(/\.mdx$/, ".md");
        try{
            directory_node = SharedState.dir_tree?.resolveAbsolutePath(path_without_src);
        }
        catch(e){
            console.log("Did not find directory node for path without src:", e.toString());
        }
    }
    if(!directory_node) return;
    for(const rule of ruleset){
        console.log(`Applying rule: ${rule.name}\nDescription: ${rule.description}`);
        out_string = rule.apply(out_string, file_details, directory_node);
    }
    // Write the processed content back to the file as a .mdx
    const path_without_vault = filePath.replaceAll("\\", "/").replace(VAULT_PATH, "");

    let output_path = path.join(".","src", "pages", path_without_vault);
    if(dirPath.startsWith("./src/pages")){
        dirPath = ""
    }
    let dir_path = path.join(".","src", "pages", dirPath.replaceAll("\\", "/").replace(VAULT_PATH, ""));
    if(path_without_vault.startsWith("src/pages")){
        output_path = output_path.replaceAll("\\", "/");
        output_path = output_path.replace("src/pages", "./");
    }
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

/*
* Runs the markdown preprocessing for each file defined at VAULT_PATH
* */
function processVault(vaultPath:string){
    const files = fs.readdirSync(vaultPath);
    for(const file of files){
        if(file.startsWith(".")) continue;
        // Check if the file is a markdown file OR a directory
        const fullPath = path.join(vaultPath, file);
        const stat = fs.statSync(fullPath);
        if(stat.isFile() && path.extname(file) === ".md"){
            console.log(`Processing file: ${fullPath}`);
            applyMarkdownPreprocessingRules(fullPath, vaultPath, rules);
        } else if(stat.isDirectory()){
            // Recursively process the directory
            processVault(fullPath);
        }
        else if(stat.isFile() && path.extname(file) !== ".md"){
            // Everything else is copied as is
            const path_without_vault = fullPath.replaceAll("\\", "/").replace(VAULT_PATH, "");
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
function processLinks(path_in:string = path.join(".","src", "pages")){
    const files = fs.readdirSync(path_in);
    for(const file of files){
        if(file.startsWith(".")) continue;
        // Check if the file is a markdown file OR a directory
        const fullPath = path.join(path_in, file);
        const stat = fs.statSync(fullPath);
        if(stat.isFile() && path.extname(file) === ".mdx"){
            console.log(`Processing links in file: ${fullPath}`);
            applyMarkdownPreprocessingRules(fullPath, path.dirname(fullPath).replace(path.join(".","src", "pages"), ""), link_rules);
        } else if(stat.isDirectory()){
            // Recursively process the directory
            processLinks(fullPath);
        }
    }
}
function generate(){
    //clean output directories or create if not exists
    if(fs.existsSync(path.join(".","src", "pages"))){
        fs.rmSync(path.join(".","src", "pages"), { recursive: true, force: true });
    }
    fs.mkdirSync(path.join(".","src", "pages"), { recursive: true });
    SharedState.vault_path = VAULT_PATH;
    // Firstly, build a directory tree of all files in the vault
    SharedState.dir_tree = buildDirTree(VAULT_PATH, null, VAULT_PATH);
    console.log(SharedState.dir_tree.findFileInVault("test"))
    // Then process those files and apply the rules in markdown_rules
    processVault(VAULT_PATH);
    buildDirPage();
    processLinks()
    //applyMarkdownPreprocessingRules("/Users/boerg/Documents/Main/Technikerschule/Technikerschule Links & Intro.md", "/Users/boerg/Documents/Main/Technikerschule");
    buildTagPage();
    const output_path = path.join(".","src", "pages", "directory_tree.json");
    fs.writeFileSync(output_path, JSON.stringify(SharedState.dir_tree.toJson(), null, 2), "utf-8");
}
generate();