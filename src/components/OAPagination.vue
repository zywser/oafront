
<script setup name="OAPagination">
import { defineModel,defineProps } from 'vue';


let props = defineProps({
    total:{
        type:Number,
        default:0
    },
    pagSize:{
        type:Number,
        default:10
    }
    
})

let page = defineModel({required:true})

</script>




<template lang="">
    <div>

        <el-pagination 
                    background layout="prev, pager,next" 
                    :total="props.total"
                    v-model:current-page="page"
                    :page-size="props.pagSize"
                     />
        
    </div>
</template>



<style lang="">
    
</style>
