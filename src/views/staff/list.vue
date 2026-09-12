<script name="staff_list" setup>
import OAmain from '@/components/OAmain.vue';
import { ref,reactive,onMounted,watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';

import timeFormatter from '@/utils/timeFormatter';
import Detail from '../inform/detail.vue';
import staffHttp from '@/api/staffHttp.js';
import OAPagination from '@/components/OAPagination.vue';
import OADialog from '@/components/OADialog.vue';
import { useAuthStore } from '@/stores/auth.js';

const authStore = useAuthStore()
const BASE_URL  =import.meta.env.VITE_BASE_URL

let staffs= ref([])


let pagination = reactive({
    page:1,
    total:0
})

let page_size = ref(10)


let dialogVisible = ref(false)

let staffForm = reactive({
    status:1
})

let handleIndex = 0


let tableRef= ref()



// ###############员工过滤模块#####################
let departments = ref([])

let filterForm = reactive({
    department_id:null,
    realname:"",
    data_joined:[]
})
// ###############员工过滤模块#####################





async function fetchStaffList(page,page_size){
    try{
        // 获取员工列表
        let data = await staffHttp.getstafflist(page, page_size,filterForm)
    
        pagination.total = data.count
        pagination.page = page
        // 后端返回的 results 应已按页过滤
        staffs.value = data.results

    }catch(detail){
        ElMessage.error(detail)
    }
}

const onSubmitEditSfaff=async ()=>{
    let staff = staffs.value[handleIndex]
    try{
        let newstaff =  await staffHttp.updateStaffStatus(staff.uid,staffForm.status)
    
        console.log(staffForm.status);
        
        ElMessage.success("员工状态修改成功！")
        dialogVisible.value = false
        staffs.value.splice(handleIndex,1,newstaff)

    }catch(detail){
        ElMessage.error(detail)
    }

}


const onEditStaff=(index)=>{
    handleIndex = index
    dialogVisible.value = true
    let status = staffs.value[index]
    staffForm.status = staffs.status
}

const onDeleteStaff=async (staff)=>{
    // 二次确认，避免误删
    try{
        await ElMessageBox.confirm(
            `确定要删除员工「${staff.realname}」吗？删除后该员工的相关记录（公告、考勤等）将一并删除。`,
            "删除员工",
            {
                confirmButtonText: "删除",
                cancelButtonText: "取消",
                type: "warning"
            }
        )
    }catch(e){
        // 用户点击取消，直接返回
        return
    }

    try{
        await staffHttp.deleteStaff(staff.uid)
        ElMessage.success("员工删除成功！")
        // 删除后刷新列表：若当前页已删空且不是第一页，则回退一页（watch 会自动重新请求）
        if(staffs.value.length === 1 && pagination.page > 1){
            pagination.page -= 1
        }else{
            fetchStaffList(pagination.page,page_size.value)
        }
    }catch(detail){
        ElMessage.error(detail)
    }
}

// ###############员工过滤模块#####################
const onSearch= () =>{
    fetchStaffList(1,page_size.value)
    console.log(filterForm);


}


const onDownload=async()=>{
    // 获取选中的对象
    let rows = tableRef.value.getSelectionRows()
    if(!rows || rows.length==0){
        ElMessage.info("请先选中要导出的员工！")
        return;
    }
    try{
        let response = await staffHttp.downloadStaffs(rows.map(row => row.uid))
        // 借助a标签，将response数据，放到a标签的herf属性上，然后模拟点击事件
        // 将返回的二进制数据，创建成一个url对象
        let href = URL.createObjectURL(response.data)
        // 创建a标签
        const a = document.createElement("a")
        a.href = href
        // 设置a标签的download属性，在点击的时候，就会进行下载
        a.setAttribute("download","员工信息.xlsx")
        // 将a标签添加进网页结构中
        document.body.appendChild(a)
        // 模拟点击行为,只要点击了，那么浏览器就会启动下载操作（下载href属性指定的数据）
        a.click()

        // 只要执行了下载，a标签就没用了，那么就可以在网页中移除了
        document.body.removeChild(a)
        // 移除URL数据
        URL.revokeObjectURL(href)


    }catch(detail){
        ElMessage.error(detail)
    }

}

const onUploadsuccess=()=>{
    ElMessage.success("员工上传成功！")
    // 重新获取第一页的员工数据
    fetchStaffList(1,page_size.value)

}


const onUploadFail = (error)=>{
    const detail = JSON.parse(error.message).detail
    ElMessage.error(detail)
}

// ###############员工过滤模块#####################



onMounted(async()=>{
    fetchStaffList(1,page_size.value)

    try{
        let data = await staffHttp.getAllDepartment()
        departments.value = data.results
        
        
    }catch(detail){
        ElMessage.error(detail)
    }
})


watch(()=> pagination.page, async function(value){
    fetchStaffList(value,page_size.value)
})

// 当每页大小改变时，重置到第 1 页并重新请求
watch(()=> page_size.value, async function(value){
    pagination.page = 1
    fetchStaffList(1, value)
})
</script>

<template lang="">
    <OADialog title="修改员工状态" v-model="dialogVisible" @submit="onSubmitEditSfaff">


        <el-form :model="staffForm">
                <el-form-item label="状态">
                     <el-radio-group v-model="staffForm.status">
                        <el-radio :value="1" >激活</el-radio>
                        <el-radio :value="3" >锁定</el-radio>
                        </el-radio-group>
                  
                </el-form-item>
              
            </el-form>

    </OADialog>



    <OAmain title="员工列表">

        <!-- ----------------员工过滤模块------------------- -->
        <el-card>
            <el-form :inline="true" class="my-form-inline">
                <el-form-item label="按部门">
                      <el-select v-model="filterForm.department_id">
                        <el-option v-for="department in departments" :label="department.name" :value="department.id"
                            :key="department.name" />
                    </el-select>

                    <el-form-item label="按姓名">
                        <el-input v-model="filterForm.realname"/>
                    </el-form-item>

                    <el-form-item label="按入职时间">
                        <el-date-picker v-model="filterForm.data_joined" type="daterange" range-separator="到"
                        start-placeholder="起始日期" end-placeholder="结束日期" format="YYYY-MM-DD" value-format="YYYY-MM-DD" />
                    </el-form-item>

                    <el-form-item>
                        <el-button type="primary" icon="Search" @click="onSearch">搜索</el-button>
                    </el-form-item>

                    <el-form-item>
                        <el-button type="danger" icon="Download" @click="onDownload">下载</el-button>
                    </el-form-item>

                    <el-form-item>
                          <el-upload
                                :action="BASE_URL+ '/staff/upload' "
                                :headers="{Authorization:'JWT '+authStore.token}"
                                :on-success="onUploadsuccess"
                                :on-error="onUploadFail"
                                :show-file-list="false"
                                :auto-upload="true"
                                accept=".xlsx,.xls"
                            >
                                <el-button type="danger" icon="Upload">上传</el-button>
                                <template #tip>
                                </template>
                            </el-upload>
                    </el-form-item>



                </el-form-item>
            </el-form>



        </el-card>
          <!-- ----------------员工过滤模块------------------- -->

        <el-card>

            <el-table  style="width: 100%" :data="staffs" ref="tableRef">

            <el-table-column type="selection" width="55" />
            <el-table-column label="序号" width="120">
            <template #default="scope">{{ scope.$index+1 }}</template>
            </el-table-column>
            <el-table-column label="姓名" width="200" prop="realname"/>
            <el-table-column label="邮箱" width="200" show-overflow-tooltip  prop="email"/>

            <el-table-column label="入职时间" width="270" prop="date_joined">
                <template #default="scope">
           {{ timeFormatter.stringFromDateTime(scope.row.date_joined) }}
        </template>
            </el-table-column>



            <el-table-column property="address" label="部门" width="270" prop="department.name"/>


            <el-table-column property="address" label="状态" width="270">

                <template #default="scope">
                     
                    <el-tag v-if="scope.row.status ==1" type="success">正常</el-tag>
                    <el-tag v-else-if="scope.row.status ==2" type="warning">未激活</el-tag>
                    <el-tag v-else type="danger">已锁定</el-tag>

                </template>

            </el-table-column>

            
            <el-table-column property="address" label="操作" >
                <template #default="scope">
                    <el-button icon="Edit" type="primary" @click="onEditStaff(scope.$index)"></el-button>
                    <el-button icon="Delete" type="danger" title="删除员工" @click="onDeleteStaff(scope.row)"></el-button>

                </template>
            </el-table-column>

            </el-table>


 
            <template #footer>

                <div>

                    <el-form-item label="每页：">
                        <el-select style="width:100px" v-model="page_size" size="small">
                            <el-option label="10/页" :value="1"></el-option>
                            <el-option label="20/页" :value="2"></el-option>
                        </el-select>
                    </el-form-item>
                        <el-pagination 
                    background layout="prev, pager,next" 
                    :total="pagination.total"
                    v-model:current-page="pagination.page"
                    :page-size="page_size"
                     />

                </div>
            </template>



</el-card>

</OAmain>

</template>

<style scoped>
/* 让 select的input框变长*/
.my-form-inline  .el-input{
    --el-input-width:140px;
}

.my-form-inline .el-select{
    --el-select-width:140px;
}
.my-form-inline .el-form-item{
    margin-right:20px
}


</style>