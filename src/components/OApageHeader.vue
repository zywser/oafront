<script setup name="OAPageHader">

import {useRouter} from "vue-router"
import { defineProps } from "vue"
const router = useRouter()
import { ArrowLeft } from '@element-plus/icons-vue'

const goBack=()=>{
    router.go(-1)
}

let props = defineProps({
    content:""
})

</script>

<template lang="">
    <div>
            <el-page-header :icon="ArrowLeft" title="返回" @back="goBack">
            <template #content>
              <span class="text-large font-600 mr-3"> {{props.content}} </span>
            </template>
          </el-page-header>
    </div>
</template>

<style lang="">
    
</style>