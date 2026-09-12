<script setup name="box">
import { ref,defineModel,defineProps,defineEmits} from 'vue';

let dialogFormVisible = defineModel({required:true});

let props = defineProps({
  title:{
    type:String,
    default:""
  },
  width:{
    type:String,
    default: "500"
  }
})

// 定义事件

const emits = defineEmits(["cancel","submit"])
const onCancel=()=>{
  dialogFormVisible.value = false;
  emits("cancel")
}

const onSubmit = () =>{
    emits("submit")

}

</script>

<template>
  <div>
   <el-dialog v-model="dialogFormVisible" :title="props.title" :width="props.width">
            <slot></slot>
            <template #footer>
                <div class="dialog-footer">
                    <el-button @click="onCancel">关闭</el-button>
                    <el-button type="primary" @click="onSubmit">确认</el-button>
                </div>
            </template>
        </el-dialog>>
  </div>
</template>

<style>
</style>