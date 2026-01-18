import * as fs from "node:fs";
import * as path from "node:path";
import rules from "./markdown_rules.ts";
let test_string = `
this is a cool string
## Looove iiiit
[[My Link]]
[[../../Another Link|Custom Text]]
#tag1 #tag2 #tag3
    `
/*
* Applies all rules defined in markdown_rules to the markdown file at filePath.
* */
export function applyMarkdownPreprocessingRules(filePath:string){
    const file_details = {
        name: "test",
        directory: "/some/directory/"
    }
    for(const rule of rules){
        console.log(`Applying rule: ${rule.name}\nDescription: ${rule.description}`);
        const result = rule.apply(test_string, file_details);
        test_string = result;
    }
    console.log("Final Result:\n", test_string);
}

class MarkdownGraph{
    public static links_map: Map<string, Set<string>> = new Map();
}
/*
* Extracts and normalizes links and tags from the markdown file content and stores those relationships in a map
* */
export function buildMarkdownGraph(fileContent:string){

}
applyMarkdownPreprocessingRules("test")