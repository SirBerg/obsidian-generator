import type { DirNode } from "./build_dir_tree.ts";
import * as fs from "node:fs";

let tags: Map<String, DirNode[]> = new Map();

export function processTag(tag: string, file: DirNode) {
    if(tags.has(tag)){
        tags.get(tag)?.push(file);
        return;
    }else{
        tags.set(tag, [file]);
    }
}

export function buildTagPage() {
    const tagsPagePath: string = "./src/pages/tags.html"
    fs.rmSync(tagsPagePath);
    tags.forEach((nodes, tag) => {
        fs.appendFileSync(tagsPagePath, `<h1>${tag}<h1>`);
        nodes.forEach((node) => {
            fs.appendFileSync(tagsPagePath, `<a href="${node.getDirectory()}/${node.getName()}">${node.getName()}</a><br/>`);
        })
    })
}