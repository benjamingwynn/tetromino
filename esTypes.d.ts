/**
 * This file is used to declare addition typescript types from the esOpts file.
 * This includes types for plugins and global variables.
 *
 * @file
 * @format
 */

declare module "*.css"
declare module "*.png"
declare module "*.woff"
declare module "*.woff2"
declare module "*.svg"
declare module "*.gif"

/** Whether running on a local development server. Use `if (DEV)` to escape emitting code in the production build. */
declare const DEV: boolean

/** Misc build parameters accessible from the source code. */
declare const BUILD: {time: number}
