import { EditorView } from 'codemirror'



export const customTheme = EditorView.theme({
    "&":{
        outline: "none !important",
        height: "100%",
    },
    ".cm-content" : {
        fontFamily: "var(--font-plex-mono), monospace",
        fontSize: "11px",
        lineHeight: "1.6",
        letterSpacing: "0.02em"
    },
    ".cm-line":{
        padding: "2px 0"
    },
    ".cm-scroller":{
        scrollbarWidth: "thin",
        scrollbarColor: "#3f3f46 transparent"
    },
    ".cm-gutters": {
        border: "none",
        backgroundColor: "transparent"
    }
})