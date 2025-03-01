import { filterFn, mapFn, sortFn } from "./funcitons"
import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"

// components shared across all pages
export const sharedPageComponents: SharedLayout = {
  head: Component.Head(),
  header: [],
  afterBody: [],
  footer: Component.Footer({
    links: {
      GitHub: "https://github.com/0x0oz/",
      LinkedIn: "https://www.linkedin.com/in/0x0oz/",
      "RSS": "/index.xml",
      "Email": "mailto:0xoz@ieee.org",
      Discord: "@0x0oz",
      // "Discord Community": "https://discord.gg/cRFFHYye7t",
    },
  }),
}



// the defaults
let breadcrumbs = Component.Breadcrumbs({
  spacerSymbol: "❯", // symbol between crumbs
  rootName: "Home", // name of first/root element
  resolveFrontmatterTitle: true, // whether to resolve folder names through frontmatter titles
  hideOnRoot: true, // whether to hide breadcrumbs on root `index.md` page
  showCurrentPage: true, // whether to display the current page in the breadcrumbs
})

let explorer = Component.Explorer({
  mapFn: mapFn,
  sortFn: sortFn,
  filterFn: filterFn,
  order: ["filter", "sort", "map"],
})

// components for pages that display a single page (e.g. a single note)
export const defaultContentPageLayout: PageLayout = {
  beforeBody: [
    breadcrumbs,
    Component.ArticleTitle(),
    Component.ContentMeta(),
    Component.TagList(),
  ],
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
    Component.Search(),
    Component.Darkmode(),
    explorer,
  ],
  right: [
    Component.Graph(),
    Component.DesktopOnly(Component.TableOfContents()),
    Component.Backlinks(),
  ],
}

// components for pages that display lists of pages  (e.g. tags or folders)
export const defaultListPageLayout: PageLayout = {
  beforeBody: [breadcrumbs, Component.ArticleTitle(), Component.ContentMeta()],
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
    Component.Search(),
    Component.Darkmode(),
    explorer,
  ],
  right: [],
}


