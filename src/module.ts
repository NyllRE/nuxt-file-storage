import { defineNuxtModule, createResolver, addImportsDir } from "@nuxt/kit";

// Module options TypeScript interface definition
export interface ModuleOptions {}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: "nuxt-storage",
    configKey: "storage",
  },
  // Default configuration options of the Nuxt module
  defaults: {},
  setup(options, nuxt) {
    // @ts-expect-error
    const resolver = createResolver(import.meta.url);

    addImportsDir(resolver.resolve("runtime/composables"));
  },
});
