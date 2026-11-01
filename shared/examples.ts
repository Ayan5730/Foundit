import type { CreateReport, CreateClaim, Bootstrap, Success, PublicReport } from "./api.ts";
export const lostReportRequest:CreateReport = {
  client_request_id:"10000000-0000-4000-8000-000000000001",kind:"lost",
  title:"Dark blue backpack",category:"Bags",color:"Dark blue",
  description:"Silver zipper; last seen near the main hall.",
  visible_features:["silver zipper"],location:"Main Hall",occurred_at:"2026-11-01T10:15:00+05:30",
  intake_id:null,private_clue:null,
};
export const foundReportRequest:CreateReport = {
  ...lostReportRequest,client_request_id:"10000000-0000-4000-8000-000000000002",kind:"found",
  title:"Navy laptop bag",color:"Navy",description:"Metallic zips.",visible_features:["metallic zips"],
  occurred_at:"2026-11-01T11:05:00+05:30",private_clue:"Fictional triangle mark inside the pocket",
};
export const claimRequest:CreateClaim = {
  client_request_id:"10000000-0000-4000-8000-000000000003",
  lost_report_id:"20000000-0000-4000-8000-000000000001",
  found_report_id:"20000000-0000-4000-8000-000000000002",
  evidence:"Fictional triangle mark inside the pocket",
};
export const anonymousBootstrap: Success<Bootstrap> = {data:{
  api_version:"v1",event:{id:"foundit-hackathon",name:"FoundIt Hackathon Help Desk"},user:null,
  capabilities:{can_report:false,can_review:false},
  choices:{categories:["Bags","Electronics","Keys","Clothing","Books","Accessories","Drinkware","Other"],
    locations:["Registration","Main Hall","Workshop Rooms","Cafeteria","Entrance","Other"]},
  limits:{title:120,description:2000,evidence:2000,image_bytes:4194304,shared_preview_bytes:524288},
  recovery_organizations:[{id:"rapid_metro",name:"Rapid Metro"}],
}};
export const publicReportResponse:Success<PublicReport> = {data:{
  id:claimRequest.lost_report_id,event_id:"foundit-hackathon",kind:lostReportRequest.kind,
  title:lostReportRequest.title,category:lostReportRequest.category,color:lostReportRequest.color,
  description:lostReportRequest.description,visible_features:lostReportRequest.visible_features,
  location:lostReportRequest.location,occurred_at:lostReportRequest.occurred_at,status:"active",
  created_at:"2026-11-01T05:00:00.000Z",has_shared_preview:false,
}};
