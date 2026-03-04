import {Extension} from "@codemirror/state"
import { javascript } from "@codemirror/lang-javascript"
import {html} from "@codemirror/lang-html"
import {css} from "@codemirror/lang-css"
import {json} from "@codemirror/lang-json"
import {markdown} from "@codemirror/lang-markdown"
import {python} from "@codemirror/lang-python"
import { sql } from "@codemirror/lang-sql"
import { yaml } from "@codemirror/lang-yaml"
import { cpp } from "@codemirror/lang-cpp"
import { java } from "@codemirror/lang-java"
import { rust } from "@codemirror/lang-rust"
import { go } from "@codemirror/lang-go"

export const getLanguageExtension = (filename:string): Extension =>{
    const ext = filename.split(".").pop()?.toLowerCase();//get the extension of the file

    switch (ext) {
        case "js":
            return javascript();
        case "jsx":
            return javascript({jsx:true});
        case "ts":
            return javascript({typescript:true});
        case "tsx":
            return javascript({typescript:true,jsx:true});
        case "html":
            return html();
        case "css":
            return css();
        case "json":
            return json();
        case "md":
        case "mdx":
            return markdown();
        case "py":
            return python();
        case "sql":
            return sql();
        case "yml":
        case "yaml":
            return yaml();
        case "c":
        case "cpp":
        case "cc":
        case "h":
        case "hpp":
            return cpp();
        case "java":
            return java();
        case "go":
            return go();
        case "rust":
            return rust();
        default:
            return javascript();//fallback
    }
}