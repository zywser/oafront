<script name="home" setup>
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import * as echarts from 'echarts';


import OAmain from '@/components/OAmain.vue';
import { useAuthStore } from '@/stores/auth';
import timeFormatter from '@/utils/timeFormatter';
import homeHttp from "@/api/homeHttp"
import informHttp from '@/api/informHttp'


let informs = ref([])
let absents = ref([])



onMounted(async () => {
    try {
        // 使用与通知列表相同的接口来获取用户可见的通知（后端按用户所属部门过滤）
      
        informs.value = await homeHttp.getLatestInforms()

        absents.value = await homeHttp.getLatestAbsents()

        let rows = await homeHttp.getDepartmentStaffCount()
        console.log("informs:",informs);
        console.log(absents);
        

        let xdata = []
        let ydata = []
        for(let row of rows){
            xdata.push(row.name)
            ydata.push(row.staff_count)
        }
        // 基于准备好的dom，初始化echarts实例
        var myChart = echarts.init(document.getElementById('main'));
        // 绘制图表
        myChart.setOption({
            tooltip: {},
            xAxis: {
                data: xdata
            },
            yAxis: {},
            series: [
                {
                    name: '销量',
                    type: 'bar',
                    data: ydata
                }
            ]
        });

    } catch (detail) {

        ElMessage.error(detail)
    }





})
</script>
<template lang="">
<OAmain title="首页">
    <!-- 顶部图表：单独整行 -->
    <el-card style="margin-bottom: 20px;">
        <template #header>
            <h2>部门员工数量</h2>
        </template>
        <div id="main" style="width: 100%;height:300px;"></div>
    </el-card>

    <!-- 下面左右两栏，放同一el-row，gutter控制间距 -->
    <el-row :gutter="24">
        <!-- 左侧：最新通知 占12格 -->
        <el-col :span="12">
            <el-card>
                <template #header>
                    <h2>最新通知</h2>
                </template>
                <el-table :data="informs">
                    <el-table-column label="标题">
                        <template #default="scope">
                            <router-link :to="{ name: 'inform_detail', params: { pk: scope.row.id } }">
                                {{ scope.row.title }}
                            </router-link>
                        </template>
                    </el-table-column>
                    <el-table-column label="发布者" prop="author.realname" />
                    <el-table-column label="发布时间">
                        <template #default="scope">
                            {{ timeFormatter.stringFromDateTime(scope.row.create_time) }}
                        </template>
                    </el-table-column>
                    <el-table-column label="是否已读">
                        <template #default="scope">
                            <el-tag v-if="scope.row.reads?.length > 0">已读</el-tag>
                            <el-tag v-else type="danger">未读</el-tag>
                        </template>
                    </el-table-column>
                </el-table>
            </el-card>
        </el-col>

        <!-- 右侧：最新请假 占12格 -->
        <el-col :span="12">
            <el-card>
                <template #header>
                    <h2>最新请假</h2>
                </template>
                <el-table :data="absents">
                    <el-table-column label="部门" prop="requester.department.name" />
                    <el-table-column label="发起人" prop="requester.realname" />
                    <!-- 修复拼写错误 statar_date → start_date -->
                    <el-table-column label="起始时间" prop="statar_date" />
                    <el-table-column label="结束时间" prop="end_date" />
                    <el-table-column label="发起时间">
                        <template #default="scope">
                            {{ timeFormatter.stringFromDateTime(scope.row.create_time) }}
                        </template>
                    </el-table-column>
                </el-table>
            </el-card>
        </el-col>
    </el-row>
</OAmain>
</template>
<style lang="">

</style>