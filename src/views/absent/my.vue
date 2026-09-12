<script setup name="myabsent">
import OAPageHader from "@/components/OApageHeader.vue"
import absentHttp from "@/api/absentHttp";
import { ref, reactive, onMounted, computed ,watch} from "vue";
import { ElMessage } from "element-plus";
import timeFormatter from "@/utils/timeFormatter";
import OAmain from "@/components/OAmain.vue";
import OAPagination from "@/components/OAPagination.vue";
import OADialog from "@/components/OADialog.vue";


let formLabelWidth = "100px"
let dialogFormVisible = ref(false)

let absentForm = reactive({
    title: "",
    absent_type_id: "",
    data_range: [],
    request_content: ""

})

let absents = ref([]) //个人考勤信息
let absent_types = ref([])
let absentFormRef = ref()

let responder = ref({
    email: "",
    realanname: ""
})
let pagination = reactive({
    total :0,
    page:1,
})

let page_size = ref(10)

let responder_str = computed(() => {
    if (responder.email) {
        return "[" + responder.email + "]" + responder.realanname
    } else {
        return "无"
    }
})

let rules = reactive({
    title: [
        { required: true, message: '请输入标题！', trigger: 'blur' }
    ],
    absent_type_id: [{ required: true, message: '请选择请假类型！', trigger: 'change' }],
    data_range: [{ required: true, message: '请选择时间！', trigger: 'blur' }],
    request_content: [{ required: true, message: '请输入请假理由！', trigger: 'blur' }],
})

const onshowdialog = () => {
    absentForm.title = ""
    absentForm.absent_type_id = " "
    absentForm.data_range = []
    absentForm.request_content = ""
    dialogFormVisible.value = true
}

const Onsubmitabsent = () => {
    absentFormRef.value.validate(async (valid, field) => {
        if (valid) {
            let data = {
                title: absentForm.title,
                absent_type_id: absentForm.absent_type_id,
                statar_date: absentForm.data_range[0],
                end_date: absentForm.data_range[1],
                request_content: absentForm.request_content,
            }
            try {
                let absent = await absentHttp.applyAbsent(data)
                dialogFormVisible.value = false
                absents.value.unshift(absent)
            } catch (detail) {
                ElMessage.error(detail)

            }
        }
    })
}




watch(()=>pagination.page,(value)=>{
    console.log("page:",value);
    requestAbsents(value)
    

})
const requestAbsents= async(page)=>{
    try{
        let absents_data = await absentHttp.getAbsents(page)
        let total = absents_data.count;
        let results = absents_data.results
        pagination.total=total
        absents.value = results
        console.log(absents.value);
        console.log(absents_data);
        
        
    }catch(detail){
        ElMessage.error(detail)
    }
}

onMounted(async () => {

    try {
        
        // 获取请假类型
        let absent_types_data = await absentHttp.getAbsentTypes()
        absent_types.value = absent_types_data

        // 获取审批者
        let responder_data = await absentHttp.getResponder()
        Object.assign(responder, responder_data)


        // 获取个人请假列表
        requestAbsents(1)
    } catch (detail) {
        ElMessage.error(detail)

    }
})

</script>
<template>
    <OAmain title="个人考勤">

        <el-card style="text-align:right;" shadow="never">
                <el-button type="primary" plain @click="onshowdialog">
                    <el-icon>
                        <Plus />
                    </el-icon>发起考勤
                </el-button>
            </el-card>




              <el-card>
                <!-- 修复：el-table 不是 el-table-column -->
                <el-table :data="absents">
                    <el-table-column prop="title" label="标题" />
                    <el-table-column prop="absent_type.name" label="请假类型" />
                    <el-table-column prop="request_content" label="请假原因" />

                    <!-- 修复发起时间插槽嵌套 -->
                    <el-table-column label="发起时间">
                        <template #default="scope">
                            {{ timeFormatter.stringFromDateTime(scope.row.create_time) }}
                        </template>
                    </el-table-column>

                    <el-table-column prop="statar_date" label="开始时间" />
                    <el-table-column prop="end_date" label="结束时间" />

                    <!-- 审核领导 -->
                    <el-table-column label="审核领导">
                        <template #default="scope">
                            {{ responder_str }}
                        </template>
                    </el-table-column>
                    <el-table-column prop="response_content" label="反馈意见" min-width="150" show-overflow-tooltip />


                    <el-table-column label="审核状态" width="120px" align="center">
                        <template #default="scope">
                            <el-tag type="info" v-if="scope.row.status == 1">审核中</el-tag>
                            <el-tag type="success" v-else-if="scope.row.status == 2">已通过</el-tag>
                            <el-tag type="danger" v-else-if="scope.row.status == 3">已拒绝</el-tag>
                            <!-- 增加一个兜底状态，防止数据异常显示空白 -->
                            <span v-else>-</span>
                        </template>
                    </el-table-column>

                </el-table>

                  <template #footer>
                    <el-pagination 
                    background layout="prev, pager,next" 
                    :total="pagination.total"
                    v-model:current-page="pagination.page"
                    :page-size="page_size"
                     />
                     
                     <!-- <OAPagination v-model="pagination.page" :total="pagination.total" ></OAPagination> -->
                  </template>

            </el-card>


    </OAmain>
    <div>
   

        <!-- 弹窗 -->
         <OADialog title="" v-model="dialogFormVisible" @submit="Onsubmitabsent">

             <el-form :model="absentForm" :rules="rules" ref="absentFormRef">
                <el-form-item label="标题" :label-width="formLabelWidth" prop="title">
                    <el-input v-model="absentForm.title" autocomplete="off" />
                </el-form-item>

                <el-form-item label="请假类型" :label-width="formLabelWidth" prop="absent_type_id">
                    <el-select v-model="absentForm.absent_type_id" placeholder="请选择请假类型">
                        <el-option v-for="item in absent_types" :label="item.name" :value="item.id" :key="item.id" />
                    </el-select>
                </el-form-item>

                <el-form-item label="请假时间" :label-width="formLabelWidth" prop="data_range">
                    <el-date-picker v-model="absentForm.data_range" type="daterange" range-separator="到"
                        start-placeholder="起始日期" end-placeholder="结束日期" format="YYYY-MM-DD" value-format="YYYY-MM-DD" />
                </el-form-item>
 
                <el-form-item label="审批人" :label-width="formLabelWidth">
                    <el-input :value="responder_str" readonly disabled autocomplete="off" />
                </el-form-item>

                <el-form-item label="请假理由" :label-width="formLabelWidth" prop="request_content">
                    <el-input type="textarea" v-model="absentForm.request_content" autocomplete="off" />
                </el-form-item>
            </el-form>


         </OADialog>

     
    </div>
</template>
<style lang="">

</style>