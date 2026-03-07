// our file system is just a basic array but for webcontainers its very different (refer to the docs)
// so we need a function to convert our file structure to theres so that we can pass it to webcontainers

import {FileSystemTree} from "@webcontainer/api"
import { Doc, Id } from "../../../../convex/_generated/dataModel"

type FileDoc = Doc<"files">//Doc is the type of document stored in convex

// convert our flat convex files to nested FileSystemTree for WebContainers

export const buildFileTree = (files: FileDoc[]): FileSystemTree =>{
    const tree: FileSystemTree = {};
    // kv pair : {id of the file, file contents}
    const filesMap = new Map(files.map((f)=>[f._id,f]));//defining a files map to remove dupes and easier manipulation

    const getPath = (file: FileDoc): string[] =>{
        // get the paths like: "src/components/button.tsx"
        const parts: string[] = [file.name] //"navbar.tsx"
        let parentId = file.parentId;

        // now we will traverse up the path
        while(parentId){//if the file/folder isn't at root then we have a parent id
            const parent = filesMap.get(parentId);//grab the parent from the parentId;
            if(!parent) break;//if no parent then we are at the root now we can break the traversal up path
            parts.unshift(parent.name)//add the parent name to the parts array
            parentId = parent.parentId//now we move backwards in the filetree to get the parent of the current parent
        }
        return parts;//return the path
    }

    // get the path for each file and get its tree
    for(const file of files){
        const pathParts = getPath(file);//get the path
        let current = tree;

        for(let i = 0; i<pathParts.length;i++){//build the tree
            const part = pathParts[i];
            const isLast = i === pathParts.length-1;

            if(isLast){//for the last file/folder ,i.e., the root entity
                if(file.type === "folder"){//if folder then make it an empty directory
                    if(!current[part]){
                        current[part] = {directory: {}}
                    }
                }else if(!file.storageId && file.content !== undefined){
                    // text files
                    current[part] = {file : {contents: file.content}}
                }
            }else{
                // not last elem
                if(!current[part]){//if this branch on the file tree DNE then create an empty branch
                    current[part] = {directory:{}}
                }
                const node = current[part];
                if("directory" in node){
                    // if its a folder then the directory exists
                    current = node.directory//pass the directory to the current tree
                }
            }
        }
    }

    return tree;
}

// take the file array and makes them into paths like : "src/components/button.tsx"
// get the full path for file by traversing the parent chain

export const getFilePath = (
    file: FileDoc,
    filesMap: Map<Id<"files">,FileDoc>
): string =>{
    const parts: string[] = [file.name];
    let parentId = file.parentId;

    // traversing up the file tree using the parentId whilst it still exists
    while(parentId){
        const parent = filesMap.get(parentId)//fetch the parent
        if(!parent) break;
        parts.unshift(parent.name)
        parentId = parent.parentId;
    }

    return parts.join("/")//instead of having 2 separate parts in an array file the file traversal, we will have a common string for fileTree traversal
}