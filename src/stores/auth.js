import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

const USER_KEY = "OA_USER_KEY"
const TOKEN_KEY = "OA_TOKEN_KEY"


export const PermissionChoices = {
    //所以权限
    ALL: 0b111,
    // 普通员工权限
    Staff:0b000,
    // 需要董事会权限
    Boarder:0b001,
    //TeamLeader团队领导的权限
    Leader:0b010,
}


export const useAuthStore = defineStore('auth', () => {
    let _user = ref({});
    let _token = ref("");


    function setUserToken(user,token){
        //保存到对象上（内存上）
        _user.value = user;
        _token.value = token;


        // 保存到浏览器的localStorage(本地存储)上（硬盘中）
        localStorage.setItem(USER_KEY,JSON.stringify(user))
        localStorage.setItem(TOKEN_KEY,token)
    }

    function claerUserToken(){
         _user.value = {}
         _token.value = ""
        localStorage.removeItem(USER_KEY)
        localStorage.removeItem(TOKEN_KEY)
    }





           // 计算属性
        let user = computed(()=>{
            //在JS中
            //1. 空对象{}：用if判断，会返回true，Object.keys(_user.value).length==0
            //2. 空字符串"": 用if判断，会返回false

            // 如果_user是一个空对象，那么就试图从localStorage来读取
            if(Object.keys(_user.value)==0){
                let user_str = localStorage.getItem(USER_KEY)
                if(user_str){
                    _user.value = JSON.parse(user_str)
                }

            } return _user.value
        })

        let token = computed(()=>{
            if(!_token.value){
                let token_str =  localStorage.getItem(TOKEN_KEY)
                if(token_str){
                    _token.value = token_str
                }
              
            } return _token.value
        })


        let is_loging = computed(()=>{
            if(Object.keys(user.value).length>0 && token.value){
                return true
            }
            return false
        })

        let own_permissions =computed(()=>{
            let _permissions = PermissionChoices.Staff

            // 判断是否是董事会成员
            if(user.value.department?.name == "董事会"){
                _permissions |= PermissionChoices.Boarder
            }

            // 判断是否是部门leader
            if(user.value.department?.leader?.uid == user.value.uid){
                 _permissions |= PermissionChoices.Leader
            }
            return _permissions
        })

        function has_permission(permissions,opt="|"){
            if(!Array.isArray(permissions) || permissions.length === 0){
                return true
            }

            let results = permissions.map((permission) => (permission & own_permissions.value) === permission)

            if(opt === "|"){
                return results.includes(true)
            }else{
                return !results.includes(false)
            }
        }
        
    

// 想让外面读取到，就必须返回
  return { setUserToken, user, token,is_loging,claerUserToken,has_permission,PermissionChoices }
})
