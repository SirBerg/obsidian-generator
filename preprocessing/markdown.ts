import * as fs from "node:fs";
import * as path from "node:path";
import rules from "./markdown_rules.ts";
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
    const output_path = path.join(".","src", "pages", "vault", path_without_vault);
    const dir_path = path.join(".","src", "pages", "vault", dirPath.replace(VAULT_PATH, ""));
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
            const output_path = path.join(".","src", "pages", "vault", path_without_vault);
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
    // Remove the output directory
    const output_dir = path.join(".","src", "pages", "vault");
    if(fs.existsSync(output_dir)){
        //fs.rmSync(output_dir, { recursive: true, force: true });
    }
    processVault(VAULT_PATH);
}
generate();