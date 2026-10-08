export class User {
  constructor(
    public readonly id: number,
    public readonly name: string,
    public readonly email: string,
    public readonly role: 'admin' | 'user',
  ) {}
  get isAdmin(): boolean { return this.role === 'admin'; }
  static fromJson(j: any): User { return new User(j.id, j.name, j.email, j.role === 'admin' ? 'admin' : 'user'); }
}
