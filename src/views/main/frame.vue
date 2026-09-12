<script name="frame" setup>
import { ref, computed, reactive, onMounted, watch } from 'vue';


import {
  Expand,
  Fold,
  HomeFilled,
  Location,
  UserFilled,
  User,
  BellFilled,
  CirclePlusFilled,
  List,
  Avatar,
  ArrowDown,
  ChatDotRound,
} from '@element-plus/icons-vue'
import { useAuthStore } from "@/stores/auth"
import router from '@/router';
import { ElMessage } from 'element-plus';
import routes from '@/router/frame';

const iconComponents = {
  HomeFilled,
  Location,
  UserFilled,
  User,
  BellFilled,
  CirclePlusFilled,
  List,
  Avatar,
  ArrowDown,
  ChatDotRound,
}

const menuIcon = (name) => iconComponents[name] || null

import authhttp from '@/api/authhttp';



let defaultactive = ref("home")
let defaultOpeneds = ref([])
let asideWidth = computed(() => {
  if (isCollapse.value) {
    return "64px"
  } else {
    return "250px"
  }
})

const onColiapse = () => {
  isCollapse.value = !isCollapse.value
}
const handleClose = () => { }




const userstore = useAuthStore()


const onexit = () => {
  userstore.claerUserToken();

  router.push({ name: "login" })

}

let isCollapse = ref(false);
const dialogVisible = ref(false)
const form = reactive({
  oldpwd: "",
  newpwd: "",
  newpwd2: ""
})
let formTag = ref()
let rules = reactive({
  oldpwd: [
    { required: true, message: '请输入旧密码！', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度需要在6-20之间', trigger: 'blur' },
  ],
  newpwd: [
    { required: true, message: '请输入新密码！', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度需要在6-20之间', trigger: 'blur' },
  ],
  newpwd2: [
    { required: true, message: '请输入确认密码！', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度需要在6-20之间', trigger: 'blur' },
  ],
})

const formLabelWidth = "140px"

const onsubmit = () => {
  formTag.value.validate(async (valid, fields) => {
    if (valid) {
      try {
        await authhttp.resetpwd(form.oldpwd, form.newpwd, form.newpwd2)
        ElMessage.success("密码修改成功！")
        dialogVisible.value = false


      } catch (detail) {
        ElMessage.error(detail)

      }

    } else {
      ElMessage.error("请按要求填写字段！")
    }
  })

}



const onControlResetpwdDialg = () => {
  form.oldpwd = "";
  form.newpwd = "";
  form.newpwd2 = "";
  dialogVisible.value = true


  console.log("ddd");

}


const updateMenuState = (routeName) => {
  defaultactive.value = routeName || ''
  // 找到包含当前路由名的父路由，设置为展开状态
  const rootChildren = routes[0]?.children || []
  const parent = rootChildren.find(r => (r.children || []).some(c => c.name === routeName))
  defaultOpeneds.value = parent ? [parent.name] : []
}

onMounted(() => {
  updateMenuState(router.currentRoute.value.name)
})


</script>



<template lang="">



<div>
    <!-- 补全 </el-dialog> 闭合标签 -->
    <el-dialog v-model="dialogVisible" title="修改密码" width="500">
      <el-form :model="form" :rules="rules" ref="formTag">
        <el-form-item label="旧密码" :label-width="formLabelWidth" prop="oldpwd">
          <el-input v-model="form.oldpwd" autocomplete="off" type="password"/>
        </el-form-item>

        <el-form-item label="新密码" :label-width="formLabelWidth" prop="newpwd">
          <el-input v-model="form.newpwd" autocomplete="off" type="password"/>
        </el-form-item>

        <el-form-item label="确认密码" :label-width="formLabelWidth" prop="newpwd2">
          <el-input v-model="form.newpwd2" autocomplete="off" type="password"/>
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <!-- 修复：onsubmit = false 改为调用函数 onsubmit -->
          <el-button type="primary" @click="onsubmit">
            确认
          </el-button>
        </div>
      </template>
</el-dialog>
</div>



<div>
  <el-container class="container">
    <el-aside :width="asideWidth" class="aside">
      <router-link to="/" class="brand"><strong>沐光</strong><span v-show="!isCollapse">OA系统</span></router-link>

      <el-menu active-text-color="#4ECDC4" background-color="#1F3A3D" class="el-menu-vertical-demo"
        :default-active="defaultactive" :default-openeds="defaultOpeneds" text-color="#E0F2F1" :collapse="isCollapse"
        :collapse-transition="false" @close="handleClose" :router="true">


        <template v-for="route in routes[0].children">
          <template v-if="!route.meta?.perpermissions || userstore.has_permission(route.meta.perpermissions,route.meta.opt)">

                <el-menu-item v-if="!route.children" :index="route.name" :route="{name:route.name}">

        <el-icon>
          <component :is="menuIcon(route.meta.icon)" />
        </el-icon>

        <span>{{route.meta.text}}</span>
        </el-menu-item>




        <el-sub-menu  v-else :index="route.name">
          <template #title>
            <el-icon><component :is="menuIcon(route.meta.icon)" /></el-icon>
           <span>{{route.meta.text}}</span>
          </template>

        <template v-for="children in route.children">

                <template v-if="!children.meta?.perpermissions || userstore.has_permission(children.meta.perpermissions,children.meta.opt)">
                  <el-menu-item v-if="!children.meta.hidden" :index="children.name" :route="{name:children.name}">
          <el-icon>
            <component :is="menuIcon(children.meta.icon)" />
          </el-icon>
          <span>{{children.meta.text}}</span>
        </el-menu-item>
                 </template>
          </template>

        </el-sub-menu>




        </template>



        </template>



      </el-menu>


    </el-aside>



    <el-container>



      <el-header class="header">
        <div class="left-header">
          <el-button v-show="isCollapse" :icon="Expand" @click="onColiapse" />
          <el-button v-show="!isCollapse" :icon="Fold" @click="onColiapse" />
        </div>


        <el-dropdown :hide-on-click="false">
          <span class="el-dropdown-link">
            <el-avatar icon="UserFilled" />
            <span style="margin-left : 10px">[{{userstore.user.department.name}}] {{userstore.user.realname}}</span>
            <el-icon class="el-icon--right">
              <component :is="menuIcon('ArrowDown')" />
            </el-icon>
          </span>
          <template #dropdown>
      <el-dropdown-menu> 
        <el-dropdown-item @click="onControlResetpwdDialg">修改密码</el-dropdown-item>
        <el-dropdown-item @click="onexit">退出登录</el-dropdown-item>
       
      </el-dropdown-menu>
    </template>
        </el-dropdown>

      </el-header>


      <el-main class="main"><router-view></router-view></el-main>
    </el-container>
  </el-container>
</div>
</template>



<style scoped>
.aside {
  background-color: #1F3A3D;
  box-shadow: 0 14px 28px rgba(31, 58, 61, 0.25), 0 10px 10px rgba(31, 58, 61, 0.22);

}

.container {
  height: 100vh;
  background-color: #f4f9f9;
}

.aside .brand {

  color: white;
  text-decoration: none;
  border-bottom: 1px solid #2C5054;
  background: linear-gradient(135deg, #172E31 0%, #1F3A3D 100%);
  height: 60px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 20px;

}

.header {
  height: 60px;
  background-color: #fff;
  border-bottom: 1px solid #e6e6e6;
  border-radius: 5px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.el-dropdown-link {
  display: flex;
  align-items: center;
}


.el-menu {
  border-right: none;
}
</style>

