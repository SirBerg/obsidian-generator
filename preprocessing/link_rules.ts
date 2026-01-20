/*
* This file contains markdown rules related to links.
* These are applied AFTER all other markdown rules and after a full vault pass has been concluded (to find out all the links).
* */
import {type rule, SharedState} from "./markdown_rules.ts";
import type {DirNode} from "./build_dir_tree.ts";
import path from "node:path";
import type {file_details} from "./markdown_rules.ts";
export const link_rules:Array<rule> = [
    {
        name: "Add LinkedNotes Section",
        description: "Adds a Linked Notes section at the end of the file, listing all files that link to this file.",
        apply: (input:string, file_details: file_details, directory_tree_node:DirNode)=>{
            // Split these two cases:
            // incoming
            // outgoing
            let outgoing = SharedState.link_map[directory_tree_node.getDirectory() + "/" + directory_tree_node.getName()]?.filter((node)=>node.type === "outgoing");
            let incoming = SharedState.link_map[directory_tree_node.getDirectory() + "/" + directory_tree_node.getName()]?.filter((node)=>node.type === "incoming");
            if(!outgoing){
                outgoing = []
            }
            if(!incoming){
                incoming = []
            }
            return input + `
                <div class="connected-notes">
                    <h3>Outgoing Links</h3>
                    <div class="connected-notes-list">
                        ${
                            outgoing.map((node)=>{
                            const file_name_without_extension = path.basename(node.node.getName(), path.extname(node.node.getName()));
                            return (`
                                <div class="connected-note">
                                    <a href="${encodeURI(node.node.getDirectory() + "/" + file_name_without_extension)}">${file_name_without_extension}</a>
                                </div>`)
                            }).join("\n")
                        }
                    </div>
                    <h3>Incoming Links</h3>
                    <div class="connected-notes-list">
                        ${
                            incoming.map((node)=>{
                                const file_name_without_extension = path.basename(node.node.getName(), path.extname(node.node.getName()));
                                return (`
                                    <div class="connected-note">
                                        <a href="${encodeURI(node.node.getDirectory() + "/" + file_name_without_extension)}">${file_name_without_extension}</a>
                                    </div>`)
                            }).join("\n")
                        }
                    </div>
                </div>
            `
        }
    }
]