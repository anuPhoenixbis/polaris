import {create} from "zustand"
import { Id } from "../../../../convex/_generated/dataModel"

interface TabState{
    openTabs: Id<"files">[],
    activeTabId: Id<"files"> | null,
    previewTabId: Id<"files"> | null,
}

const defaultTabState: TabState = {
    openTabs: [],
    activeTabId: null,
    previewTabId: null,
}

interface EditorStore{
    tabs: Map<Id<"projects">,TabState>,//for each project we hold the tabState mapping with their ids
    getTabState: (projectId: Id<"projects">) => TabState,
    openFile:(
        projectId: Id<"projects">,
        fileId: Id<"files">,
        options: {pinned: boolean}
    ) => void,
    closeTab:(
        projectId: Id<"projects">,
        fileId: Id<"files">
    ) => void,
    closeAllTabs: (
        projectId: Id<"projects">
    ) => void,
    setActiveTab:(//set the tab which is currently active
        projectId: Id<"projects">,
        fileId: Id<"files">
    ) => void
}

export const useEditorStore = create<EditorStore>()((set,get)=>({
    tabs: new Map(),//maps so that no dupe tabs are opened
    getTabState: (projectId)=>{
        return get().tabs.get(projectId) ?? defaultTabState;//fetches the TabState of the current Tab or the defaultTabState
    },
    openFile(projectId, fileId, {pinned}) {
        const tabs = new Map(get().tabs);
        const state = tabs.get(projectId) ?? defaultTabState;//get the state of the Tab or pass down the default
        const {openTabs, previewTabId} = state;//fetches the open tabs and preview tabs from the state(preview tabs are the ones which we haven't previously been working or just opened to take a peek in it and not to edit in it; these tabs get replaced by other files which we click to open but open tabs are persistent)
        const isOpen = openTabs.includes(fileId);//pass isOpen as true only if openTabs have fileId

        // open tab as preview - replace exiting preview or add new
        if(!isOpen && !pinned){//if preview isn't opened and isn't pinned then if current preview tab exists then in the openTabs mark the current id as fileId or else if no preview tab is opened then just add the current fileId along openTabs to the newTabs
            const newTabs = previewTabId
                ? openTabs.map((id)=>(id === previewTabId) ? fileId : id)
                : [...openTabs,fileId]
            // set the tabs to be in this state
            tabs.set(projectId,{
                openTabs: newTabs,
                activeTabId: fileId,
                previewTabId: fileId,
            });
            set({tabs});
            return;
        }

        // opening as pinned - add new tab
        if(!isOpen && pinned){
            tabs.set(projectId,{
                ...state,
                openTabs: [...openTabs,fileId],
                activeTabId: fileId,
            });
            set({tabs});
            return;
        } 

        // file already opened - just activate (and pin of double-clicked)
        const shouldPin = pinned && previewTabId === fileId;
        tabs.set(projectId,{
            ...state,
            activeTabId: fileId,
            previewTabId: shouldPin ? null: previewTabId,
        });
        set({tabs});
    },
    closeTab: (projectId,fileId)=>{
        const tabs = new Map(get().tabs);
        const state = tabs.get(projectId) ?? defaultTabState;
        const {openTabs, activeTabId, previewTabId} = state;
        const tabIndex = openTabs.indexOf(fileId)

        if(tabIndex === -1) return;

        const newTabs = openTabs.filter((id)=>id!==fileId)

        let newActiveTabId = activeTabId;
        if(activeTabId === fileId){  // ← fixed: was activeTab
            if(newTabs.length === 0){
                newActiveTabId = null;
            }else if(tabIndex >= newTabs.length){
                newActiveTabId = newTabs[newTabs.length - 1]
            }else{
                newActiveTabId = newTabs[tabIndex];
            }
        }

        tabs.set(projectId,{
            openTabs: newTabs,
            activeTabId: newActiveTabId,
            previewTabId: previewTabId === fileId ? null : previewTabId,
        });
        set({tabs});
    },
    closeAllTabs: (projectId : Id<"projects">) => {
        const tabs = new Map(get().tabs);
        tabs.set(projectId,defaultTabState)
        set({tabs});
    },
    setActiveTab: (projectId,fileId)=>{
        const tabs = new Map(get().tabs);
        const state = tabs.get(projectId) ?? defaultTabState;
        tabs.set(projectId, {...state,activeTabId: fileId})
        set({tabs});
    }
}))