import {defineConfig} from "vite";
import {resolve} from "node:path";
export default defineConfig({root:resolve("previews/exercise-3d/full"),base:"/turbo-octo-pancake/predogled-3d/v3/",publicDir:false,build:{outDir:resolve("work/full-preview-build"),emptyOutDir:true}});
