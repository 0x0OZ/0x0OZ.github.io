import { Options } from "./quartz/components/ExplorerNode"


export const mapFn: Options["mapFn"] = (node) => {
    node.displayName = node.displayName.replace(/_/g, " ")
    if (node.depth > 0) {
        // set emoji for file/folder
        if (node.file) {
            node.displayName = "📄 " + node.displayName
        } else {
            node.displayName = "📁 " + node.displayName
        }
    }
}
export const filterFn: Options["filterFn"] = (node) => {
    // set containing names of everything you want to filter out
    const omit = new Set(["authoring content", "tags", "hosting"])
    return !omit.has(node.name.toLowerCase())
    // return node.file?.frontmatter?.tags?.includes("explorerexclude") !== true
}
export const sortFn: Options["sortFn"] = (a, b) => {
    // sort by depth first, then alphabetically
    return a.depth - b.depth || a.displayName.localeCompare(b.displayName)
}
