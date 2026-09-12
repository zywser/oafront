<script setup name="subabsent">
import OAPageHader from "@/components/OApageHeader.vue"
import absentHttp from "@/api/absentHttp";
import { ref, reactive, onMounted } from "vue";
import { ElMessage } from "element-plus";
import timeFormatter from "@/utils/timeFormatter";
import OAmain from "@/components/OAmain.vue";

import OAPagination from "@/components/OAPagination.vue";
import OADialog from "@/components/OADialog.vue";




let absents = ref()
let pagination = reactive({
    total: 0,
    page: 1
})

let diaalogVisible = ref(false)

let absentForm = reactive({
    status: 2,
    response_content: ""

})

let rules = reactive({
    status: [{ required: true, message: '请输入标题！', trigger: 'change' }],
    response_content: [{ required: true, message: '请输入理由！！', trigger: 'blur' }]
})

let absentFormRef = ref()
let handleIndex = null



const onshowdialog = (index) => {
    absentForm.status=2;
    absentForm.response_content="";
    diaalogVisible.value = true
    handleIndex = index

    
}

const Onsubmitabsent= ()=>{

    absentFormRef.value.validate(async(valid,field)=>{
        if(valid){
           try{
            // 隐藏对话框
            diaalogVisible.value=false;
            const absent = absents.value[handleIndex]
            const data = await absentHttp.handleSubAbsent(absent.id,absentForm.status,absentForm.response_content)
            console.log(data);
            absents.value.splice(handleIndex,1,data)
            ElMessage.success("下属考勤处理成功！")
            

           }catch(detail){
            ElMessage.error(detail)
           }

        }

    })
}
  
   






onMounted(async () => {
    try {
        let data = await absentHttp.getSubabsents()
        console.log(data);
        pagination.total = data.count;
        absents.value = data.results;

    } catch (detail) {
        ElMessage.error(detail)
    }
})
</script>

<template lang="">
    <OADialog title="处理考勤" v-model="diaalogVisible" @submit="Onsubmitabsent" label-width="100px">

        <el-form :model="absentForm" :rules="rules" ref="absentFormRef">
                <el-form-item label="结果"  prop="status">
                     <el-radio-group v-model="absentForm.status">
      <el-radio :value="2" >通过</el-radio>
      <el-radio :value="3" >拒绝</el-radio>
    </el-radio-group>
                  
                </el-form-item>

                <el-form-item label="理由" prop="response_content">

                    <el-input type="textarea" v-model="absentForm.response_content" autocomplete="off"/>
                </el-form-item>

              
            </el-form>

    </OADialog>




    <OAmain title="下属考勤">
              <el-card>
                <!-- 修复：el-table 不是 el-table-column -->
                <el-table :data="absents">
                    <el-table-column prop="title" label="标题" />
                    <el-table-column label="发起人">
                        <template #default="scope">
                            {{'['+scope.row.requester.department.name + "]" + scope.row.requester.realname}}

                        </template>
                    </el-table-column>
                    <el-table-column prop="absent_type.name" label="请假类型" />
                    <el-table-column prop="request_content" label="请假原因" />

                    <!-- 修复发起时间插槽嵌套 -->
                    <el-table-column label="发起时间">
                        <template #default="scope">
                            {{ timeFormatter.stringFromDateTime(scope.row.create_time) }}
                        </template>
</el-table-column>

<el-table-column prop="start_date" label="开始时间" />
<el-table-column prop="end_date" label="结束时间" />

<!-- 审核领导 -->
<el-table-column prop="responder.realname" label="审核领导" />
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
<el-table-column label="处理">
    <template #default="scope">
          <el-button icon="EditPen" type="primary" v-if="scope.row.status==1" @click="onshowdialog(scope.$index)"/>
          <el-button v-else=disabled type="default">已处理</el-button>
                         
     </template>


</el-table-column>

</el-table>

<template #footer>
                    <!-- <el-pagination 
                    background layout="prev, pager,next" 
                    :total="pagination.total"
                    v-model:current-page="pagination.page"
                    :page-size="10"
                     /> -->
                      <OAPagination v-model="pagination.page" :total="pagination.total"></OAPagination>
                  </template>

</el-card>



</OAmain>


</template>

<style lang="">

</style>z
