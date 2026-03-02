// Base padding for root level items(after the project header)
export const BASE_PADDING = 12;
// additional padding per nesting level
export const LEVEL_PADDING = 12;

export const getItemPadding = (level: number,isFile: boolean)=>{
    // files need extra padding since they don't have chevron
    const fileOffset = isFile ? 16 : 0;//16 px is the width of the chevron icon so we gotta counter that
    return BASE_PADDING+level*LEVEL_PADDING + fileOffset
}