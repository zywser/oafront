<script setup name="informpublish">
import { ref, reactive, computed, onBeforeUnmount, shallowRef, onMounted } from 'vue'
import { Editor, Toolbar } from '@wangeditor/editor-for-vue'
import { ElMessage } from "element-plus";

import '@wangeditor/editor/dist/css/style.css' // 引入 css



import OAmain from '@/components/OAmain.vue'
import staffHttp from '@/api/staffHttp'
import { useAuthStore } from '@/stores/auth';
import informHttp from '@/api/informHttp';
import router from '@/router';
const authStore = useAuthStore()


let InformForm = reactive({
    title: "",
    content: "",
    department_ids: []
})
const rules = reactive({
    title: [{ required: true, message: "请输入标题！", trigger: "blur" }],
    content: [{ required: true, message: "请输入内容！", trigger: "blur" }],
    department_ids: [{ required: true, message: "请选择部门！", trigger: "change" }],
})

let FormRef = ref()
let formLabelWidth = "100px"
let departments = ref([])




// ------------ 这是wangEditor相关配置--------------------
// 编辑器实例，必须用 shallowRef
const editorRef = shallowRef()

const toolbarConfig = {}

//上传图片具体配置
const editorConfig = {
    placeholder: '请输入内容...',
    MENU_CONF: {
        uploadImage: {
            // 服务端地址必填，否则上传图片会报错。
            server: import.meta.env.VITE_BASE_URL + "/image/upload",

            // form-data fieldName ，默认值 'wangeditor-uploaded-image'，就是后端校验图片的字段名
            fieldName: "image",

            // 单个文件的最大体积限制，默认为 2M。
            // 注意：这里放宽到 20M，实际 10MB 限制由下方 customUpload 与后端共同把关，
            // 否则 wangEditor 前端拦截大图时只在控制台打印，用户看不到提示。
            maxFileSize: 20 * 1024 * 1024,

            // 最多可上传几个文件，默认为 100
            maxNumberOfFiles: 10,

            // 选择文件时的类型限制，默认为 ['image/*'] 。如不想限制，则设置为 []
            allowedFileTypes: ['image/*'],

            // 自定义增加 http  header
            headers: {
                Authorization: "JWT " + authStore.token

            },
            timeout: 15 * 1000, // 15 秒（大图上传适当放宽）

            // 完全接管上传：前端先按 10MB 提示，再把请求发给后端；
            // 后端返回 errno!=0 时同样弹出 message（如“图片不能超过10MB！”）
            customUpload(file, insertFn) {
                const IMAGE_MAX_SIZE = 10 * 1024 * 1024
                if (file.size > IMAGE_MAX_SIZE) {
                    ElMessage.error("图片不能超过10MB！")
                    return
                }

                const formData = new FormData()
                formData.append("image", file)

                // VITE_BASE_URL 形如 http://127.0.0.1:8000/api，媒体文件属于后端根路径（不含 /api），
                // 若直接用 VITE_BASE_URL 拼接会得到 /api/media/... 404
                const origin = (import.meta.env.VITE_BASE_URL || "").replace(/\/api\/?$/, "")

                fetch(import.meta.env.VITE_BASE_URL + "/image/upload", {
                    method: "POST",
                    headers: {
                        Authorization: "JWT " + authStore.token,
                    },
                    body: formData,
                })
                    .then((res) => res.json())
                    .then((data) => {
                        if (data.errno === 0) {
                            insertFn(origin + data.data.url, data.data.alt, origin + data.data.href)
                        } else {
                            ElMessage.error(data.message || "图片上传失败")
                        }
                    })
                    .catch(() => {
                        ElMessage.error("图片上传失败，请重试")
                    })
            },



        }
    }
}
let mode = "default"

// 组件销毁时，也及时销毁编辑器
onBeforeUnmount(() => {
    const editor = editorRef.value
    if (editor == null) return
    editor.destroy()
})

const handleCreated = (editor) => {
    editorRef.value = editor // 记录 editor 实例，重要！
}
// ------------ 这是wangEditor相关配置--------------------





onMounted(async () => {
    try {
        let data = await staffHttp.getAllDepartment()
        departments.value = data.results

    } catch (detali) {
        ElMessage.error(detali)


    }
})

const onSubmit = () => {
    FormRef.value.validate(async(valid, fields) => {
        if (valid) {
            try{
                let data = await informHttp.publishInform(InformForm)
                console.log(data);

                ElMessage.success("发布成功")
                router.push({name:"inform_list"})
                

            }catch(detali){
                ElMessage.error(detali)
            }

        }
    })
}
</script>


<template>
    <OAmain title="发布通知">

        <el-card>

            <el-form :model="InformForm" :rules="rules" ref="FormRef">
                <el-form-item label="标题" :label-width="formLabelWidth" prop="title">
                    <el-input v-model="InformForm.title" autocomplete="off" />
                </el-form-item>

                <el-form-item label="部门可见" :label-width="formLabelWidth" prop="department_ids">
                    <el-select multiple v-model="InformForm.department_ids">
                        <el-option :value="0" label="所有部门"></el-option>
                        <el-option v-for="department in departments" :label="department.name" :value="department.id"
                            :key="department.name" />
                    </el-select>
                </el-form-item>

                <el-form-item label="内容" :label-width="formLabelWidth" prop="content">

                    <div style="border: 1px solid #ccc;width: 100%;">
                        <Toolbar style="border-bottom: 1px solid #ccc" :editor="editorRef"
                            :defaultConfig="toolbarConfig" :mode="mode" />
                        <Editor style="height: 500px; overflow-y: hidden;" v-model="InformForm.content"
                            :defaultConfig="editorConfig" :mode="mode" @onCreated="handleCreated" />
                    </div>

                </el-form-item>

                <el-form-item>
                    <div style="text-align: right; flex: 1;">

                        <el-button type="primary" @click="onSubmit">
                            提交
                        </el-button>

                    </div>
                </el-form-item>


            </el-form>



        </el-card>


    </OAmain>



</template>




<style scoped></style>