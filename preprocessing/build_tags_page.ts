import type { DirNode } from "./build_dir_tree.ts";
import * as fs from "node:fs";

let tags: Map<string, Set<DirNode>> = new Map();

export function processTag(tag: string, file: DirNode) {
    if(tags.get(tag)){
        tags.get(tag)?.add(file);
    }else{
        tags.set(tag, new Set<DirNode>([file]));
    }
    return;
}

export function buildTagPage() {
    const tagsPagePath: string = "./src/pages/tags.astro"

    fs.existsSync(tagsPagePath) ? fs.rmSync(tagsPagePath) : null;
    fs.writeFileSync(tagsPagePath, `---
        import Layout from './src/layouts/Layout.astro';
        ---
        <Layout>
        `);
    tags.forEach((nodes, tag) => {
        fs.appendFileSync(tagsPagePath, `<h1>${tag}</h1>`);
        nodes.forEach((node) => {
            fs.appendFileSync(tagsPagePath, `<a href="${node.getDirectory()}/${node.getName().replace(/\.[^\/.]+$/, "")}">${node.getName().replace(/\.[^\/.]+$/, "") }</a><br/>`);
        })
    })
    fs.appendFileSync(tagsPagePath, `</Layout>`);
}