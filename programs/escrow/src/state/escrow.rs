use anchor_lang::prelude::*;


#[account]
pub struct EscrowState {
    pub seeds: u64,
    pub bump: u8,
    pub mint_a: Pubkey,
    pub mint_b: Pubkey,
    pub recieve_amount: u64,
    pub maker: Pubkey
}

impl Space for Escrow {
    // First 8 Bytes are Discriminator (u64)
    const INIT_SPACE: usize = 8 + 8 + 1 + 32 + 32 + 32 + 8 ;
}