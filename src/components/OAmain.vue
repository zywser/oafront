<script setup>
import OApageHeader from './OApageHeader.vue';
import { defineProps } from 'vue';

let prop = defineProps({
    title :""
})
</script>


<template lang="">
    <div>
       <el-space direction="vertical" fill :size="20" style="width:100%">
    <OApageHeader :content=prop.title></OApageHeader>

    <slot></slot>

       </el-space>
        
    </div>
</template>

<style lang="">

</style>