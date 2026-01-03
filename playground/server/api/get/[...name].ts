import { retrieveFileLocally } from '../../../../src/runtime/server/utils/storage'

export default defineEventHandler(async (event) => {
	// Grab the dynamic `name` param from the route
	const { name } = event.context.params as { name: string }

	return retrieveFileLocally(event, name, '/specificFolder')

	// this won't work as it tries to escape the mount
	// return retrieveFileLocally(event, name, '../../')
})
