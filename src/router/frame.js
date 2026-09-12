import frame from '@/views/main/frame.vue'


import myabsent from "@/views/absent/my.vue"
import subabsent from "@/views/absent/sub.vue"
import informpublish from "@/views/inform/publish.vue"
import informlist from "@/views/inform/list.vue"
import informdetail from "@/views/inform/detail.vue"
import staffadd from "@/views/staff/add.vue"
import stafflist from "@/views/staff/list.vue"
import agent from "@/views/agent/index.vue"
import home from '@/views/home/home.vue'
import absent from "@/views/absent/index.vue"
import inform from "@/views/inform/index.vue"
import staff from "@/views/staff/index.vue"
import { PermissionChoices } from '@/stores/auth'


const routes = [


        {
          path: '/',
          name: 'frame',
          component: frame,
          children:[
            {path:"/",name:"home",component:home,
                 meta:{
                    icon:"HomeFilled",
                    text:"首页",
                    perpermissions:[PermissionChoices.Staff],
                    opt:"|"
                },
            },

            {path:"/agent",name:"agent",component:agent,
                 meta:{
                    icon:"ChatDotRound",
                    text:"智能助手",
                    perpermissions:[PermissionChoices.Staff],
                    opt:"|"
                },
            },

            {
                path:"/absent",name:"absent",component:absent,
                meta:{
                    icon:"Location",
                    text:"考勤管理",
                    perpermissions:[PermissionChoices.Staff],
                    opt:"|"
                },
                children:[
                    {path:"my",name:"myabsent",component:myabsent,
                        meta:{
                            icon:"UserFilled",
                            text:"个人考勤",
                            perpermissions:[PermissionChoices.Staff],
                            opt:"|",
                        }
                    },
                    {path:"sub",name:"subabsent",component:subabsent,
                          meta:{
                            icon:"User",
                            text:"下属考勤",
                            perpermissions:[PermissionChoices.Boarder,PermissionChoices.Leader],
                            opt:"|"
                        }
                    },
                ]
            },

            {path:"/inform",name:"inform",component:inform,
                meta:{
                    icon:"BellFilled",
                    text:"通知管理",
                    perpermissions:[PermissionChoices.Staff],
                    opt:"|",
                },
                children:[
                    {path:"publish",name:"inform_publish",component:informpublish,
                        meta:{
                            icon:"CirclePlusFilled",
                            text:"发布通知",
                            perpermissions:[PermissionChoices.Boarder,PermissionChoices.Leader],
                            opt:"|"
                            
                        }
                    },
                    {path:"list",name:"inform_list",component:informlist,
                         meta:{
                            icon:"List",
                            text:"通知列表",
                            perpermissions:[PermissionChoices.Staff],
                            opt:"|",
                        }
                    },
                    {path:"detail/:pk",name:"inform_detail",component:informdetail,
                          meta:{
                            hidden:true,
                            perpermissions:[PermissionChoices.Staff],
                            opt:"|",
                        }
                    },

                ]
            },


            {path:"/staff",name:"staff",component:staff,
                meta:{
                    icon:"Avatar",
                    text:"员工管理",
                    perpermissions:[PermissionChoices.Boarder,PermissionChoices.Leader],
                    opt:"|"
                },
                children:[
                        {path:"add",name:"staff_add",component:staffadd,
                  meta:{
                    icon:"CirclePlusFilled",
                    text:"新增员工",
                    perpermissions:[PermissionChoices.Boarder,PermissionChoices.Leader],
                    opt:"|"
                }
            },
            {path:"list",name:"staff_list",component:stafflist,
                  meta:{
                    icon:"List",
                    text:"员工列表",
                    perpermissions:[PermissionChoices.Boarder,PermissionChoices.Leader],
                    opt:"|"
                }
            },
          ]
        },

                ]
            },
        


]

export default routes;
