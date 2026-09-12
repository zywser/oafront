<script name="login" setup>
import login_img from "@/assets/image/login.png"
import { reactive } from "vue";
import {useAuthStore} from "@/stores/auth.js"
import { useRoute } from "vue-router";
import router from "@/router";
import authhttp from "@/api/authhttp";
import { ElMessage  } from 'element-plus'


const  authStore = useAuthStore()
const userRouter = useRoute()


let form = reactive({
    email : "",
    password : ""
})


const onSubmit = async() =>{

     // 使用正则表达式来定义密码和邮箱的格式
    let emailReg = /^[a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/
    let pwdReg = /^[0-9a-zA-Z_-]{6,20}$/

    
    // 使用test方法来判断邮箱和密码格式是否正确
    if(!(emailReg.test(form.email))){
        ElMessage .info("邮箱格式不满足！")
        return
    } 

    if(!(pwdReg.test(form.password))){
        ElMessage .info("密码格式不满足！！")
        return
    }  


    // 第一版 直接使用axios
    // 发送Ajax请求
    // 这里使用axios库来发送Axjax请求
    // axios.post("http://127.0.0.1:8000/auth/login",{
    //     email : form.email,
    //     password : form.password,
    // }).then(res =>{
    //     // then 代表成功的情况 （代表返回的状态码是200）
    //     let data = res.data
    //     let token = data.token
    //     let user = data.user
    //     console.log("token:",token);
    //     console.log("user:",user);
        
    //     authStore.setUserToken(user,token);
        
    //     router.push({name:"frame"})


        

    // }).catch(err =>{
    //     // catch 代表失败的情况 （在这里代表返回的状态码是非200的）
    //     let detail = err?.response?.data?.detail||
    //      alert(detail)
    //     console.log(err);
        

    // })

    // 2 第二版，对axios进行封装

    // authhttp.login(form.email,form.password).then(res => {
    //     let data = res.data
    //     let token = data.token
    //     let user = data.user

    //     authStore.setUserToken(user,token);
        
    //     router.push({name:"frame"})
    // }).catch((err =>{
    //     let detail = err?.response?.data?.detail||
    //      alert(detail)
    //     console.log(err);

    // }))

    // 3 第三个版本，改成了异步调用方式
    try{
        let data = await authhttp.login(form.email,form.password);
        let token = data.token;
        let user = data.user;
        authStore.setUserToken(user,token);

        router.push({name:"home"})

    }catch(detail){
       ElMessage.error(detail);
    

    }
}


</script>



<template lang="">
     <div class="dowebok">
        <div class="container-login100">
            <div class="wrap-login100">
                <div class="login100-pic js-tilt" data-tilt>
                    <img :src="login_img" alt="IMG" />
                </div>

                <div class="login100-form validate-form">
                    <span class="login100-form-title"> 员工登陆 </span>

                    <div class="wrap-input100 validate-input">
                        <input class="input100" type="text" name="email" placeholder="邮箱" v-model="form.email"/>
                        <span class="focus-input100"></span>
                        <span class="symbol-input100">
                            <i class="iconfont icon-fa-envelope" aria-hidden="true"></i>
                        </span>
                    </div>

                    <div class="wrap-input100 validate-input">
                        <input class="input100" type="password" name="password" placeholder="密码" v-model="form.password" />
                        <span class="focus-input100"></span>
                        <span class="symbol-input100">
                            <i class="iconfont icon-fa-lock" aria-hidden="true"></i>
                        </span>
                    </div>

                    <div class="container-login100-form-btn">
                        <button class="login100-form-btn" @click = "onSubmit">
                            登陆
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>

</template>



<style scoped src="@/assets/css/login.css"></style>
<style scoped src="@/assets/iconfont/iconfont.css"></style>