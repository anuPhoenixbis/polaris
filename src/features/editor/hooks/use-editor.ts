import { useCallback } from "react";
import { Id } from "../../../../convex/_generated/dataModel";
import { useEditorStore } from "../store/use-editor-store";

export const useEditor = (projectId: Id<"projects">) =>{
    //zustand subscribes to all state changes without a selector so, we need to change it to particular subscriptions only 
    // const store = useEditorStore();
    const tabState = useEditorStore((state)=>state.getTabState(projectId));
    // particular subscriptions
    const openFileAction = useEditorStore((state) => state.openFile);//subscribes to only openFile state changes similarly for all the below guys as well
    const closeTabAction = useEditorStore((state) => state.closeTab);
    const closeAllTabsAction = useEditorStore((state) => state.closeAllTabs);
    const setActiveTabAction = useEditorStore((state) => state.setActiveTab);

    // useCallback will return a memoized version of the callback that only changes if one of the inputs has changed.

    const openFile = useCallback((
        fileId : Id<"files">,
        options: {pinned:boolean}
    )=>{
        openFileAction(projectId,fileId,options);
    },[openFileAction,projectId])//updates/refreshes the openFile when store updates or projectId updates

    const closeTab = useCallback(
        (fileId: Id<"files">)=>{
            closeTabAction(projectId,fileId);
        },
        [closeTabAction,projectId]
    )

    const closeAllTabs = useCallback(()=>{
            closeAllTabsAction(projectId);
        },[closeAllTabsAction,projectId]
    )

    const setActiveTab = useCallback(
    (fileId: Id<"files">) => {
        setActiveTabAction(projectId, fileId);
    },
    [setActiveTabAction, projectId]
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