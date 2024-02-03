import { ref } from "vue";

export default function () {
  const files = ref<File[]>([]);
  const serializeFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      files.value.push({
        name: file.name,
        content: e.target.result,
      });
      console.log(files);
    };
    reader.readAsDataURL(file);
  };

  const handleFileInput = (event: any) => {
    files.value.splice(0);
    for (const file of event.target.files) {
      serializeFile(file);
    }
    console.log(event.target.files);
  };

  return {
    files,
    handleFileInput,
  };
}

interface File {
  content: any;
  name: string;
}
