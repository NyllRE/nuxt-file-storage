<!-- @format -->

<script setup lang="ts">

const { submitForm, useAuthUser } = useForm()
onMounted(async () => {
	ccform.value?.querySelectorAll('.formkit-outer').forEach(autoAnimate)

   // if (localStorage.getItem('applied') === 'true')
   //    await useRouter().push(localePath('/profile'))
})
const ccform = ref<Form>()
// sumbit handlers
const submitted = ref(false)

const submitHandler = async (formData: any) => {
	const { status, response } = await submitForm(
		formData,
		formImages.value.length > 0 ? formImages.value : null
	)
	if (status === 200) {
		submitted.value = true
		localStorage.setItem('applied', 'true')
		await useRouter().push(localePath('/profile'))
	} else alert(`error occured: ${response}`)
}

// Form Files
const formImages = ref<File[]>([])

interface File {
	file: any
	name: string
}

const giveFile = (file: File) => {
	const reader = new FileReader()
	reader.onload = (e: any) => {
		formImages.value.push({
			name: file.name,
			file: e.target.result,
		})
		console.log(file, formImages.value)
	}
	reader.readAsDataURL(file.file)
}

const form = ref()
const filesRef = ref()
const fileSumbit = (e: any[]) => {
	formImages.value.splice(0)

	if (e.length > 5) {
		alert('you can only add 5 images max')
		filesRef.value.node.value.splice(0)
		return
	}
	for (const i in e) {
		if (e[i].file.size > 1_048_576 * 5) {
			// 5MB
			alert('file size should be less than 5MB!')
			filesRef.value.node.value.splice(0)
		} else {
			giveFile(e[i])
		}
	}
}

const authorizedBehalf = ref<boolean>(false)
const membersCount = ref<number>(1)
const range = (start: number, end: number, step = 1): number[] => {
	const arr = []
	for (let i = start; i <= end; i += step) {
		arr.push(i)
	}
	return arr
}
const socialSituation = ref()
const imageExtensions = ref(['jpeg', 'jpg', 'png', 'webp'])
</script>
 
<template lang="pug">
main.center.card-holder( ref="ccform" )
   UiCard(
      :title=`$t('form.first.title')`
   )
      FormKit#registration(
         type="form"
         submit-label="Register"
         @submit="submitHandler"
         :actions="false"
         #default="{ value }"
         ref="form"
      )
         div
            FormKit( name="files"
               type="file"
               :label="$t('form.first.files.label')"
               accept=".pdf,.png,.jpeg,.webp"
               :help="$t('form.first.files.help')"
               @input="fileSumbit"
               ref="filesRef"
               multiple
               validation="required"
               validation-visibility="live"
            )
         FormKit( type="submit" :label="$t('form.submit')" )

         DevOnly
            pre(wrap style="text-align: start") {{ value }}
</template>

<style scoped lang="scss">
.address {
	border-radius: 0.5em;
	border: none;
	padding-left: 1em;
	// max-width: 100%;
}

.image {
	display: flex;
	max-width: 100%;
	gap: 2em;
	flex-wrap: wrap;
}
.images {
	display: flex;
	justify-content: center;
	img {
		border-radius: 10px;
	}
	p {
		padding: 0.5em 1.5em;
		width: fit-content;
		background: #eeeeee;
		margin: 0.3em auto;
		border-radius: 1em;
		margin-bottom: 2em;
	}
}
</style>

<style lang="sass">

.formkit-outer
   display: flex
   flex-direction: column
   align-items: center
   text-align: center
   width: 100%
   .formkit-wrapper
      max-width: 100%
      width: 80%
   textarea
      width: max(600px, 100%)

.formkit-file-name
   color: black

.formkit-help
   width: 30em

.formkit-outer[data-type="file"] .formkit-wrapper .formkit-inner
   width: 25em

.formkit-outer[data-type="checkbox"]
   .formkit-inner
      width: initial !important
   .formkit-label
      font-size: initial !important

#registration
   display: grid
   place-items: center
   gap: 1.5em
   margin-block: 3em
   max-width: 100vw
   direction: ltr


   .formkit-inner
      margin: .5em 0
      border-radius: .5em
      background: white
      .formkit-decorator
         background: white
         color: black
      input,select
         border: none
         border-radius: .5em
         width: 30em
         padding: 0.5em 1em
         &:focus-visible
            border: 1px solid #f9f
         @include sc-o(portrait)
            width: 100%
      @include sc-o(portrait)
         width: 100%

   .formkit-help
      text-align: center
      font-size: 1em !important

   @include sc-o(portrait)


      label
         font-size: 2em

      .formkit-input
         width: 80%

      .formkit-input, .formkit-help, .formkit-messages, .formkit-label
         font-size: 1.7em


[data-type="checkbox"] .formkit-inner
   background: none !important

button.formkit-input
   border: none
   padding: .5em 2em
   border-radius: 1em
   background: #fff
   transition: .2s
   &:hover
      transform: scale(1.1)
      box-shadow: 0 0 10px 10px #fff3

.formkit-messages
   list-style: none
   margin-bottom: 1em
   text-align: center
   .formkit-outer &
      margin: 0
      margin-bottom: .5em
select
   width: 100%
</style>
