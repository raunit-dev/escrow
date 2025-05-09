use anchor_lang::prelude::*;


#[account]
pub struct EscrowState {
    pub seed: u64,
    pub bump: u8,
    pub mint_a: Pubkey,
    pub mint_b: Pubkey,
    pub receive_amount: u64,
    pub maker: Pubkey
}

impl Space for EscrowState {
    
    const INIT_SPACE: usize = 8 + 8 + 1 + 32 + 32 + 32 + 8 ;
}