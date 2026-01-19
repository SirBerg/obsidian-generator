export type file_details = {
    name: string;
    directory: string;
}
export type rule = {
    name: string,
    description: string,
    apply: (input: string, file_details:file_details) => string
}
export class SharedState {
    public static tag_class_map: Map<string, string> = new Map();
    public static all_files: Map<string, file_details> = new Map();
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
        apply: (input: string, file_details: file_details) => {
            return input.replace(/\[\[([^\|\]]+)(\|([^\]]+))?\]\]/g, (match, p1, p2, p3) => {
                let link_target = p1.trim().replaceAll("\\", "/");
                let link_text = p3 ? p3.trim() : link_target;

                const stripExt = (n: string) => n.replace(/\.[^/.]+$/, "");
                const hasExt = (p: string) => /\.[^\/]+$/.test(p);
                const normalize = (p: string) => p.replace(/\/+/g, "/").replace(/\/$/g, "");
                const joinPath = (...parts: string[]) =>
                    parts.map(s => s.replace(/^\/+|\/+$/g, "")).filter(Boolean).join("/");

                const toVaultRootPath = (pathParts: string[]) => {
                    const p = normalize(joinPath(...pathParts));

                    let target = (p ? `/${p}` : "/").replace(SharedState.vault_path, "");
                    // remove the .md extension for markdown files
                    if (target.endsWith(".md")) {
                        target = target.slice(0, -3);
                    }
                    return target;
                };

                // ensure graph map exists
                if (!SharedState.graph_links_map) {
                    SharedState.graph_links_map = new Map();
                }

                const sourcePath = toVaultRootPath([file_details.directory, file_details.name]);
                const recordLink = (targetPath: string, exists: boolean) => {
                    const arr = SharedState.graph_links_map.get(sourcePath) || [];
                    arr.push({ target: targetPath, exists });
                    SharedState.graph_links_map.set(sourcePath, arr);
                };

                // ensure absolute_paths map exists (class init already does, but be safe)
                if (!SharedState.absolute_paths) {
                    SharedState.absolute_paths = new Map();
                }

                const targetNameNoExt = stripExt(link_target);

                // Case 1: exact file name in same directory
                for (const [, fd] of SharedState.all_files) {
                    if (fd.directory === file_details.directory && stripExt(fd.name) === targetNameNoExt) {
                        const publicPath = toVaultRootPath([fd.directory, fd.name]);
                        const finalPath = publicPath;
                        recordLink(finalPath, true);
                        SharedState.absolute_paths.set(link_target, finalPath);
                        return `[${link_text}](${encodeURI(finalPath)})`;
                    }
                }

                // Case 2: relative path (contains / or starts with ./ or ../)
                if (link_target.includes("/") || link_target.startsWith("./") || link_target.startsWith("..")) {
                    const resolved = normalize(joinPath(file_details.directory, link_target));

                    // Try to find an exact file match in the vault (allow matching by name ignoring ext)
                    for (const [, fd] of SharedState.all_files) {
                        const candidate = normalize(joinPath(fd.directory, fd.name));
                        if (candidate === resolved || stripExt(candidate) === stripExt(resolved)) {
                            const publicPath = toVaultRootPath([fd.directory, fd.name]);
                            const finalPath = publicPath;
                            recordLink(finalPath, true);
                            SharedState.absolute_paths.set(link_target, finalPath);
                            return `[${link_text}](${encodeURI(finalPath)})`;
                        }
                    }

                    // No exact match — return resolved path from vault root (preserve extension if provided in original)
                    const publicPath = toVaultRootPath([resolved]);
                    const finalPath = publicPath;
                    recordLink(finalPath, false);
                    SharedState.absolute_paths.set(link_target, finalPath);
                    return `[${link_text}](${encodeURI(finalPath)})`;
                }

                // Case 3: absolute from vault root (starts with /)
                if (link_target.startsWith("/")) {
                    const cleaned = `/${normalize(link_target)}`.replace(/^\/+/, "/");
                    // determine existence
                    const exists = (() => {
                        for (const [, fd] of SharedState.all_files) {
                            if (toVaultRootPath([fd.directory, fd.name]) === cleaned) return true;
                        }
                        return false;
                    })();
                    const finalPath = cleaned;
                    recordLink(finalPath, exists);
                    SharedState.absolute_paths.set(link_target, finalPath);
                    return `[${link_text}](${encodeURI(finalPath)})`;
                }

                // Case 4: no known file — try to find by name anywhere in the vault
                for (const [, fd] of SharedState.all_files) {
                    if (stripExt(fd.name) === targetNameNoExt) {
                        const publicPath = toVaultRootPath([fd.directory, fd.name]);
                        const outPath = publicPath.endsWith(".md") ? publicPath.slice(0, -3) : publicPath;
                        const finalPath = outPath;
                        recordLink(publicPath, true);
                        SharedState.absolute_paths.set(link_target, finalPath);
                        return `[${link_text}](${encodeURI(finalPath)})`;
                    }
                }

                // Fallback: treat as vault-root relative, preserve provided extension if any
                const fallbackPath = toVaultRootPath([link_target]);
                const finalPath = fallbackPath;
                recordLink(finalPath, false);
                SharedState.absolute_paths.set(link_target, finalPath);
                return `<a href="${encodeURI(finalPath)}" aria-disabled="true">${link_text}</a>`;
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