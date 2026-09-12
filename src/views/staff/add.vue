<script name="staff_add" setup>
import { ref,reactive,onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';


import OAmain from '@/components/OAmain.vue';
import { useAuthStore } from '@/stores/auth';
import staffHttp from '@/api/staffHttp';

const router=useRouter()
const authStore = useAuthStore()
let formLabelWidth = "100px"
let staffFormRef = ref([])

let staffForm = reactive({
    email:"",
    password:"",
    realname:"",
})


let rules = ref({
    email:[{required:true,message:"请输入邮箱！",trigger:"blur"}],
    password:[{required:true,message:"请输入密码！",trigger:"blur"}],
    realname:[{required:true,message:"请输入真实姓名！",trigger:"blur"}],
    
})


const onSubmit =async ()=>{
    staffFormRef.value.validate(async(valid,fields)=>{
        if(valid){
            try{
                await staffHttp.addstaff(staffForm.realname,staffForm.email,staffForm.password)
                ElMessage.success("员工添加成功！")
                router.push({name:"staff_list"})
                
            }catch(detali){
                ElMessage.error(detali)
            }

        }

    })


}

onMounted(async () => {
    try {
      

    } catch (detali) {
        ElMessage.error(detali)


    }
})
</script>

<template lang="">
    <OAmain title="添加员工">
        <el-card>

            <el-form :model="staffForm" :rules="rules" ref="staffFormRef">
                <el-form-item label="姓名" :label-width="formLabelWidth" prop="realname">
                    <el-input v-model="staffForm.realname" autocomplete="off" placeholder="请输入姓名！"/>
                </el-form-item>

                <el-form-item label="邮箱" :label-width="formLabelWidth" prop="email">
                    <el-input v-model="staffForm.email" autocomplete="off" placeholder="请输入邮箱！"/>
                  
                </el-form-item>

                <el-form-item label="密码" :label-width="formLabelWidth" prop="password">
                    <el-input v-model="staffForm.password" autocomplete="off" placeholder="请输入密码！"/>
       
                </el-form-item>

                <el-form-item label="部门" :label-width="formLabelWidth">
                   <el-input   autocomplete="off" readonly disabled :placeholder=authStore.user.department.name />
                   
                </el-form-item>

                <el-form-item label="领导" :label-width="formLabelWidth" prop="request_content">
                    <el-input   autocomplete="off" readonly disabled :placeholder="'[' + authStore.user.department.name + ']' + authStore.user.realname" />
                </el-form-item>

                <el-form-item>
                    <el-button @click="onSubmit" type="primary">提交</el-button>
                </el-form-item>
            </el-form>



        </el-card>


    </OAmain>
</template>

<style lang="">
    
</style>