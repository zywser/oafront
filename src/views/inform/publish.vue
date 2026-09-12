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

            // 单个文件的最大体积限制，默认为 2M
            maxFileSize: 2 * 1024 * 1024,

            // 最多可上传几个文件，默认为 100
            maxNumberOfFiles: 10,

            // 选择文件时的类型限制，默认为 ['image/*'] 。如不想限制，则设置为 []
            allowedFileTypes: ['image/*'],

            // 自定义增加 http  header
            headers: {
                Authorization: "JWT " + authStore.token

            },
            timeout: 5 * 1000, // 5 秒

            // 自定义插入图片
            customInsert(res, insertFn) {
                if(res.errno == 0){
                     // res 即服务端的返回结果
                let data = res.data
                let url = import.meta.env.VITE_BASE_URL + data.url
                let href = import.meta.env.VITE_BASE_URL + data.href
                let alt = data.alt

                // 从 res 中找到 url alt href ，然后插入图片
                insertFn(url, alt, href)
                }else{
                    ElMessage.error(res.message)
                }           
               
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