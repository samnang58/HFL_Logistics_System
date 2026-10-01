<?php
namespace App\Http\Controllers;
use App\Models\User; use Illuminate\Http\Request; use Illuminate\Support\Facades\Hash;
class AuthController extends ApiController {
 public function login(Request $r){$d=$r->validate(['email'=>'required|email','password'=>'required|string']);$u=User::where('email',$d['email'])->first();if(!$u||!Hash::check($d['password'],$u->password))return $this->fail('Invalid credentials',[],401);$token=$u->createToken('hfl-web')->plainTextToken;return $this->ok(['token'=>$token,'user'=>$u],'Login successful');}
 public function me(Request $r){return $this->ok($r->user());}
 public function logout(Request $r){$r->user()?->currentAccessToken()?->delete();return $this->ok(null,'Logged out');}
}
