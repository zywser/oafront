<script setup name="informdetail">
import informHttp from "@/api/informHttp";
import { ref, reactive, onMounted } from "vue";
import { ElMessage } from "element-plus";
import timeFormatter from "@/utils/timeFormatter";
import { useRoute } from "vue-router";


import OAmain from "@/components/OAmain.vue";
import OAPagination from "@/components/OAPagination.vue";
import OADialog from "@/components/OADialog.vue";

const router = useRoute()


let infrom = reactive({
    title:"",
    content:"",
    create_time:"",
    author:{
        realname:"",
        departement:{
            name:""
        }

    }


})

onMounted(async()=>{
    try{
        const pk = router.params.pk
        let data =  await informHttp.getinformDetali(pk)
        Object.assign(infrom,data)
        console.log(data);
        
         // 发送请求，用于阅读通知
         await informHttp.readInform(pk)
        

    }catch(detali){
        ElMessage.error(detali)
    }

    
})


</script>


<template>

    <OAmain title="通知详情">
        <el-card>
            <template #header="sc">
                <div style="text-align: center;">
                    <h2 style="padding-bottom: 20px;">标题：{{ infrom.title }}</h2>
                    <div>
                        <span style="margin-right: 200px;">作者：{{ infrom.author.realname }}</span>
                        <span>发布时间：{{ timeFormatter.stringFromDateTime(infrom.create_time) }}</span>
                    </div>
                </div>

            </template>

            <template #default>
                <div v-html="infrom.content" class="content"></div>

            </template>
            <template #footer>阅读量：{{ infrom.read_count }}</template>
        </el-card>
    </OAmain>



</template>

<style scoped>
.content :v-deep(img){
    max-width: 100%;
}

</style>