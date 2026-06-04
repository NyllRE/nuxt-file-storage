export const createError = (opts: any) => new Error(opts?.statusMessage || 'error')
export const useRuntimeConfig = () => ({
	public: {
		fileStorage: {
			mount: process.env.FILE_STORAGE_MOUNT || '',
		},
	},
})
