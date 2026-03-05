import {StateEffect,StateField} from "@codemirror/state"
// @codemirror/state, which defines data structures that represent the editor state and changes to that state.
import {
    Decoration,
    DecorationSet,
    EditorView,
    ViewPlugin,
    ViewUpdate,
    WidgetType,
    keymap
} from "@codemirror/view"
import { fetcher } from "./fetcher";

// this entire State struggle is to achieve so that wherever my cursor currently is 
// the ai gives relevant info about that part only

// StateEffect is a way to send "messages" to update the state just like redux
// we define one effect type for setting the suggestion text
const setSuggestionEffect = StateEffect.define<string | null>({})

// StateField holds our suggestion state in the editor
// create() : returns the initial value when the editor loads
// update() : called on every transaction (keystroke,etc.) to potentially update the value
const suggestionState = StateField.define<string|null>({
    create(){
        return null;//initial state of null
    },
    update(value,transaction){
        // check each effect in this transaction
        // if we find our setSuggestionEffect, return its new value
        // otherwise, keep the current value unchanged
        for(const effect of transaction.effects){
            if(effect.is(setSuggestionEffect)) return effect.value;
        }
        return value;
    },
})
// suggestionState ensures that new info abt the code is generated when the cursor position changes

// Basically StateEffect is like the setMethod of a useState and StateField is the variable that carries the value in the useState 


// WidgetType : creates custom dom elems to display in the editor
// toDOM is called codemirror to create actual HTML elem
class SuggestionWidget extends WidgetType{
    constructor(readonly text:string){//in the constructor we take the suggestion text
        super()//getting all the props and functions of the WidgetType in this custom class
    }

    toDOM(){
        const span = document.createElement("span")
        span.textContent = this.text;//passing the suggestion text to span to be styled easily
        span.style.opacity = "0.4" //ghost text appearance
        span.style.pointerEvents = "none" //don't interfere with clicks
        return span
    }
}

// debouce for the suggestion widget
let debounceTimer: number | null = null;
let isWaitingForSuggestion = false;
const DEBOUNCE_DELAY = 300

let currentAbortController: AbortController | null = null;

// get rid of the faker function
// const generateFakeSuggestion = (textBeforeCursor: string) : string | null =>{
//     const trimmed = textBeforeCursor.trimEnd();
//     if(trimmed.endsWith("const")) return "myVariable = ";
//     if(trimmed.endsWith("function")) return "myFunction() {\n \n}";
//     if(trimmed.endsWith("console.")) return "log()";
//     return null;
// }


// generate the stuffs to go with the prompt
const generatePayload = (view: EditorView, fileName: string) =>{
    const code = view.state.doc.toString()//get the code from the view 
    if(!code || code.trim().length === 0) return null;

    const cursorPosition = view.state.selection.main.head;
    const currentLine = view.state.doc.lineAt(cursorPosition);//get the current line of code
    const cursorInLine = cursorPosition - currentLine.from//actual piece of code in the in the line

    const previousLines: string[] =[]
    const previousLinesToFetch = Math.min(5,currentLine.number-1);
    for(let i = previousLinesToFetch; i >=1 ;i--){
        previousLines.push(view.state.doc.line(currentLine.number-i).text)//get the previous lines of code 
    }
    
    const nextLines: string[] =[]
    const totalLines = view.state.doc.lines
    const linesToFetch = Math.min(5,totalLines - currentLine.number);
    for(let i = 1; i <=linesToFetch ;i++){
        nextLines.push(view.state.doc.line(currentLine.number+i).text)//get the next lines of code 
    }

    return {
        fileName,
        code,
        currentLine: currentLine.text,
        previousLines: previousLines.join("\n"),
        textBeforeCursor: currentLine.text.slice(0,cursorInLine),
        textAfterCursor: currentLine.text.slice(cursorInLine),
        nextLines: nextLines.join("\n"),
        lineNumber: currentLine.number
    }
}

// debounce plugin
const createDebouncePlugin = (filename:string) =>{
    return ViewPlugin.fromClass(
        class{
            constructor(view:EditorView){
                this.triggerSuggestion(view);//initially render the current suggestion/view
            }

            update(update: ViewUpdate){
                if(update.docChanged || update.selectionSet){//if the docChanged / cursor moved re-render the suggestion
                    this.triggerSuggestion(update.view)
                }
            }

            // create a suggestion text
            triggerSuggestion(view: EditorView){
                if(debounceTimer != null) clearTimeout(debounceTimer)//if a debounce timer pre-exists then clear it out
                
                if(currentAbortController != null){
                    currentAbortController.abort()//if prev generation is still running then run this
                }

                isWaitingForSuggestion = true;
    
                debounceTimer = window.setTimeout(async()=>{
                    // // fake suggestion (delete this block later when adding the ai suggestions here)
                    // const cursor = view.state.selection.main.head//get the cursor position on the window
                    // const line = view.state.doc.lineAt(cursor);//get the line of cursor
                    // const textBeforeCursor = line.text.slice(0,cursor-line.from)//get the text on the line before the cursor
                    // const suggestion = generateFakeSuggestion(textBeforeCursor)//get the suggestion


                    const payload = generatePayload(view,filename)
                    if(!payload){
                        isWaitingForSuggestion = false;
                        view.dispatch({effects : setSuggestionEffect.of(null)})
                        return;
                    }

                    // The AbortController interface represents a controller object that allows you to abort one or more Web requests as and when desired.
                    // this will be used to abort api requests to gemini when needed
                    currentAbortController = new AbortController()

                    // fetch the suggestion
                    const suggestion = await fetcher(
                        payload,
                        currentAbortController.signal
                    )

                    isWaitingForSuggestion = false
    
                    view.dispatch({
                        effects: setSuggestionEffect.of(suggestion),
                    });
                },DEBOUNCE_DELAY)
            }
            destroy(){
                if(debounceTimer!=null) clearTimeout(debounceTimer)
                // also remove the current Abort controller
            if(currentAbortController!=null) currentAbortController.abort()
            }
        }
    )
}


// this guy renders the texts or updates
const renderPlugin = ViewPlugin.fromClass(
    class{
        decorations : DecorationSet;
        constructor (view: EditorView){
            this.decorations = this.build(view)
        }

        // update method ; renders the updated the ghost text whenever the text changes,cursor moved, or suggestion changed
        update(update: ViewUpdate){
            // rebuild decorations if doc changed, cursor moved, or suggestion changed
            const suggestionChanged = update.transactions.some((transaction)=>{
                return transaction.effects.some((effect)=>{
                    return effect.is(setSuggestionEffect)
                })
            })//checking from the state values whether the state values have changed or not
            // by state values I mean the suggestion text

            // we re-render the suggested text when either the text we were passing changed(code changed) or the area where we placed the cursor changed or the suggestion itself changed 
            const shouldRebuild =update.docChanged || update.selectionSet || suggestionChanged 
            if(shouldRebuild){
                this.decorations = this.build(update.view);
            }
        }

        build(view: EditorView){//actually do the build suggestion text part
            if(isWaitingForSuggestion) return Decoration.none//when no suggestion is there then render nothing


            // get the current suggestion from state
            const suggestion = view.state.field(suggestionState);
            if(!suggestion){
                return Decoration.none
            }

            // create a widget decoration at cursor position
            const cursor = view.state.selection.main.head;
            return Decoration.set([
                Decoration.widget({
                    widget: new SuggestionWidget(suggestion),//updating the decoration's widget to show SuggestionWidget (which will render the ghost text) and render the current suggestion picked from the suggestion state
                    side: 1 //render the ghost text after the cursor(side: 1) , not before the cursor(side: -1)
                }).range(cursor)//the area to render the text
            ])
        }
    },
    {
        decorations: (plugin) => plugin.decorations //tell the codemirror to render our own decorations
    }
)

// tab to accept the ghost text 
const acceptSuggestionKeymap = keymap.of([
    {
        key: "Tab",
        run: (view)=>{
            const suggestion = view.state.field(suggestionState);
            if(!suggestion){
                return false //no suggestions then let the tab do the indenting
            }

            const cursor = view.state.selection.main.head;
            view.dispatch({
                changes: {from : cursor, insert: suggestion}, //insert the suggestion text
                selection: {anchor: cursor+suggestion.length},//move the cursor beyond the selected text(ghost text)
                effects: setSuggestionEffect.of(null)//clear the suggestion
            });
            return true;//handled the tab operation so don't indent
        }
    }
])

export const suggestion = (fileName:string) =>[
    suggestionState,//our state storage,
    createDebouncePlugin(fileName),//triggers suggestion on typing
    renderPlugin,//renders the ghost text of wherever my cursor is
    acceptSuggestionKeymap, //tab to accept
]