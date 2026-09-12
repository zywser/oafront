<script setup name="informlist">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';


import OAmain from '@/components/OAmain.vue';
import OADialog from '@/components/OADialog.vue';
import OAPagination from '@/components/OAPagination.vue';
import timeFormatter from '@/utils/timeFormatter';
import { useAuthStore } from '@/stores/auth';
import informHttp from '@/api/informHttp';
import http from '@/api/http';

const authStore = useAuthStore()

let informs = ref([])

let pagination = reactive({
    page:1,
    total:0
})

let dialogVisible = ref(false)
let handleIndex = 0

const onshowdialog=(index)=>{
    handleIndex = index
    dialogVisible.value = true

    
}

const onDelteInform=async()=>{
    try{
        let inform = informs.value[handleIndex]
        await informHttp.deleteInform(inform.id)
        informs.value.splice(handleIndex,1)
        dialogVisible.value = false
        ElMessage.success("通知删除成功！")

    }catch(detail){
        ElMessage.error("删除失败！")

    }

}

onMounted(async()=>{
    try{
        let data = await informHttp.getInformList(1)
        pagination.total=data.count
        informs.value = data.results

    }catch(detail){
        ElMessage.error(detail)
    }
})

</script>


<template>

    <OADialog title="提示" @submit="onDelteInform" v-model="dialogVisible">
        <span>确定删除这篇通知吗？</span>


    </OADialog>


<OAmain title="通知列表">
  <el-card>
    <el-table :data="informs">
      <el-table-column label="标题">
        <template #default="scope">

           <el-badge v-if="scope.row.reads.length==0" class="item" is-dot>

            <RouterLink :to="{name:'inform_detail',params:{pk:scope.row.id}}">
            {{ scope.row.title }}
          </RouterLink>
           </el-badge>

             <RouterLink v-else :to="{name:'inform_detail',params:{pk:scope.row.id}}">
            {{ scope.row.title }}
          </RouterLink>
       
        

        </template>
      </el-table-column>

      <el-table-column label="发布者">
        <template #default="scope">
          <!-- 加 ?. 防止author为null报错 -->
          <span v-if="scope.row.author">
            [{{ scope.row.author?.department?.name }}]{{ scope.row.author?.realname }}
          </span>
          <span v-else>未知发布人</span>
        </template>
      </el-table-column>

      <el-table-column label="发布时间">
        <template #default="scope">
           {{ timeFormatter.stringFromDateTime(scope.row.create_time) }}
        </template>
      </el-table-column>

      <el-table-column label="部门可见" >
        <template #default="scope">
          <el-tag v-if="scope.row.public" type="success">公开</el-tag>
          <template v-else>
            <el-tag v-for="department in scope.row.departments" :key="department.name" type="info">
              {{ department.name }}
            </el-tag>
          </template>
        </template>
      </el-table-column>

      <el-table-column label="操作" >
        <template #default="scope">
          <!-- 修正：scope.row.author 不是 scope.author -->
          <el-button 
            icon="Delete" 
            type="danger" 
            v-if="scope.row.author?.uid == authStore.user.uid"
            @click="onshowdialog(scope.$index)"
          />
          <!-- v-else单独写按钮，分开两个元素 -->
          <el-button v-else type="default" disabled>无</el-button>
        </template>
      </el-table-column>
    </el-table>

    <template #footer>
      <OAPagination v-model="pagination.page" :total="pagination.total"></OAPagination>
    </template>
  </el-card>
</OAmain>

</template>

<style scoped>

.el-tag{
    margin: 4px;
}
.el-badge{

margin-right: 4px;
margin-top: 4px;
}


</style>