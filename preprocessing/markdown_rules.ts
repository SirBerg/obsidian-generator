export type file_details = {
    name: string;
    directory: string;
}
export type rule = {
    name: string,
    description: string,
    apply: (input: string, file_details:file_details) => string
}
class SharedState {
    public static tag_class_map: Map<string, string> = new Map();
}
const rules:Array<rule> = [
    {
        name: "Add Layout",
        description: "Adds the layout frontmatter to the markdown file.",
        apply: (input:string, file_details:file_details)=>{
            return `---\nlayout: ./src/layouts/Layout.astro \n---\n\n${input}`;
        }
    },
    {
        name: "Add Title",
        description: "Adds the file_name as # after frontmatter.",
        apply: (input:string, file_details:file_details)=>{
            // Add file_details.name as title after the closing --- frontmatter tags
            return input.replace(/(---)(.*?)(---)/s, `$1$2$3\n # ${file_details.name}\n`);
        }
    },
    {
        name: "Replace all internal links",
        description: "Replaces all internal links identified by [[link|text]] with [text](./link.md).",
        apply: (input:string, file_details:file_details)=>{
            return input.replace(/\[\[([^\|\]]+)\|?([^\]]*)\]\]/g, (match, p1, p2) => {
                const link = p1.trim();
                const text = p2.trim() || link;
                return `[${text}](${link}.md)`;
            })
        }
    },
    {
        name: "Convert Tags",
        description: "Converts all tags identified by #tag to <div class=\"tag\">#tag</div>.",
        apply: (input:string, file_details:file_details)=>{
            return input.replace(/#(\w+)/g, (match, p1) => {
                // Generate a random number between 1 and 4 for color assignment
                const num = Math.floor(Math.random() * 4) + 1;
                return `<div class="tag tag-${num}">#${p1}</div>`;
            })
        }
    }
]
export default rules;