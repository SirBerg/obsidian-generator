import { SharedState } from "./markdown_rules.ts";
import * as fs from "node:fs";
import path from "node:path";
import { DirNode } from "./build_dir_tree";

export function buildDirPage() {
    if (!SharedState.dir_tree) throw new Error("Directory tree not built yet. Did you forget to call generate()?");

    function createIndexForDirectory(node: DirNode) {
        if (node.getType() !== "directory") return;

        const dirRelPath = node.getDirectory(); // vault-root-relative
        const targetDir = path.join(".", "src", "pages", dirRelPath);

        // Ensure target directory exists
        //fs.mkdirSync(targetDir, { recursive: true });

        const indexPath = path.join(targetDir, "index.mdx");

        // Build content: list all children as links
        const dirDisplayName = path.basename(dirRelPath) || "Home";
        const links = node.getChildren().map((child) => {
            if (child.getType() === "directory") {
                const href = encodeURI(child.getDirectory());
                const label = child.getName();
                return `<a href="${href}"><p>${label}</p></a>`;
            } else {
                const nameNoExt = child.getName().replace(".md", "").replace(".mdx", "");
                const href = encodeURI(`${child.getDirectory()}/${nameNoExt}`);
                return `<a href="${href}"><p>${nameNoExt}</p></a>`;
            }
        }).join("\n");

        const fullContent = `---\nlayout: ./src/layouts/Layout.astro\n---\n\n# ${dirDisplayName}\n\n<ul>\n${links}\n</ul>\n`;

        // Only create if missing
        if(!fs.existsSync(targetDir)){
            fs.mkdirSync(targetDir, { recursive: true });
        }
        if (!fs.existsSync(indexPath)) {
            fs.writeFileSync(indexPath, fullContent, "utf-8");
        } else {
            fs.appendFileSync(indexPath, `\n <div class="connected-notes"> <h1>Child Nodes</h1>\n${links} </div>`, "utf-8");
        }

        // Recurse into subdirectories
        for (const child of node.getChildren()) {
            if (child.getType() === "directory") {
                createIndexForDirectory(child);
            }
        }
    }

    // Start at root
    createIndexForDirectory(SharedState.dir_tree);
}