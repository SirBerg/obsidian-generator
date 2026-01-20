import * as fs from "node:fs";
import * as path from "node:path";
import rules, {SharedState} from "./markdown_rules.ts";
import {buildDirTree} from "./build_dir_tree.ts";
import {buildTagPage} from "./build_tags_page.ts";

const VAULT_PATH = "/home/berg/Documents/Schule";
//const VAULT_PATH = "./vault";

/*
* Applies all rules defined in markdown_rules to the markdown file at filePath.
* */
export function applyMarkdownPreprocessingRules(filePath:string, dirPath:string){
    console.log("Reading file content")
    const fileContent = fs.readFileSync(filePath, "utf-8");
    console.log("File content read");
    const fileStats = fs.statSync(filePath);
    if(!fileStats.isFile()) throw new Error("File is not a file.");
    const file_details = {
        name: path.basename(filePath),
        directory: path.dirname(filePath)
    }
    let out_string = fileContent;
    if(!SharedState.dir_tree) throw new Error("Directory tree not built yet. Did you forget to call generate()?");
    let directory_node = SharedState.dir_tree?.resolveAbsolutePath(filePath.replace(VAULT_PATH, ""));
    for(const rule of rules){
        console.log(`Applying rule: ${rule.name}\nDescription: ${rule.description}`);
        out_string = rule.apply(out_string, file_details, directory_node);
    }
    // Write the processed content back to the file as a .mdx
    const path_without_vault = filePath.replaceAll("\\", "/").replace(VAULT_PATH, "");
    const output_path = path.join(".","src", "pages", path_without_vault);
    const dir_path = path.join(".","src", "pages", dirPath.replaceAll("\\", "/").replace(VAULT_PATH, ""));


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
            applyMarkdownPreprocessingRules(fullPath, vaultPath);
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

function generate(){
    SharedState.vault_path = VAULT_PATH;
    // Firstly, build a directory tree of all files in the vault
    SharedState.dir_tree = buildDirTree(VAULT_PATH, null, VAULT_PATH);
    // Then process those files and apply the rules in markdown_rules
    processVault(VAULT_PATH);
    //applyMarkdownPreprocessingRules("/Users/boerg/Documents/Main/Technikerschule/Technikerschule Links & Intro.md", "/Users/boerg/Documents/Main/Technikerschule");
    buildTagPage();
    const output_path = path.join(".","src", "pages", "directory_tree.json");
    fs.writeFileSync(output_path, JSON.stringify(SharedState.dir_tree.toJson(), null, 2), "utf-8");
}
generate();