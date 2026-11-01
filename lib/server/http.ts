export class ApiError extends Error {
  status: number;
  code: string;
  fieldErrors?: Record<string, string[]>;
  constructor(status: number, code: string, message: string, fieldErrors?: Record<string, string[]>) {
    super(message); this.status=status; this.code=code; this.fieldErrors=fieldErrors;
  }
}
export function ok<T>(data:T,status=200):Response {
  return Response.json({data},{status,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
}
export function failure(error:unknown):Response {
  const known = error instanceof ApiError ? error : new ApiError(500,"internal_error","The request could not be completed.");
  return Response.json({error:{code:known.code,message:known.message,...(known.fieldErrors?{field_errors:known.fieldErrors}:{})}},
    {status:known.status,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
}
