import { useCallback } from "react";
import { Id } from "../../../../convex/_generated/dataModel";
import { useEditorStore } from "../store/use-editor-store";

export const useEditor = (projectId: Id<"projects">) =>{
    const store = useEditorStore();
    const tabState = useEditorStore((state)=>state.getTabState(projectId));

    // useCallback will return a memoized version of the callback that only changes if one of the inputs has changed.

    const openFile = useCallback((
        fileId : Id<"files">,
        options: {pinned:boolean}
    )=>{
        store.openFile(projectId,fileId,options);
    },[store,projectId])//updates/refreshes the openFile when store updates or projectId updates

    const closeTab = useCallback(
        (fileId: Id<"files">)=>{
            store.closeTab(projectId,fileId);
        },
        [store,projectId]
    )

    const closeAllTabs = useCallback(()=>{
            store.closeAllTabs(projectId);
        },[store,projectId]
    )

    const setActiveTab = useCallback(
    (fileId: Id<"files">) => {
        store.setActiveTab(projectId, fileId);
    },
    [store, projectId]
    );

    return {
        openTabs : tabState.openTabs,
        activeTabId : tabState.activeTabId,
        previewTabId: tabState.previewTabId,
        openFile,
        closeTab,
        closeAllTabs,
        setActiveTab
    }

}