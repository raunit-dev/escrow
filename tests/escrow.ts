import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { Escrow } from "../target/types/escrow";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import {
  MINT_SIZE,
  TOKEN_2022_PROGRAM_ID,
  createAssociatedTokenAccount,
  // TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createInitializeMint2Instruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
  getMinimumBalanceForRentExemptAccount,
  getMinimumBalanceForRentExemptMint,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import { randomBytes } from "crypto";
import { Stats } from "fs";
import { token } from "@coral-xyz/anchor/dist/cjs/utils";

describe("anchor-escrow", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const provider = anchor.getProvider();
  const connection = provider.connection;

  const program = anchor.workspace.Escrow as Program<Escrow>;
  const progrmaId = program.programId;
  const tokenProgram = TOKEN_2022_PROGRAM_ID;

  // const confirm = async (signature: string): Promise<string> =>

  async function confirm(signature: string): Promise<string> {
    const block = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
      signature,
      ...block,
    });
    return signature;
  }

  //const log = async (signature: string): Promise<string>

  async function log(signature: string): Promise<string> {
    console.log(
      ` Your transaction signature: https://explorer.solana.com/transaction/${signature}?cluster=custom&customUrl=${connection.rpcEndpoint}`
    );

    return signature;
  }

  const seed = new BN(randomBytes(8));

  const [maker, taker, mintA, mintB] = Array.from({ length: 4 }, () =>
    Keypair.generate()
  );

  const [makerAtaA, makerAtaB, takerAtaA, takerAtaB] = [maker, taker]
    .map((a) =>
      [mintA, mintB].map((m) =>
        getAssociatedTokenAddressSync(
          m.publicKey,
          a.publicKey,
          false,
          tokenProgram
        )
      )
    )
    .flat();

  const escrow = PublicKey.findProgramAddressSync(
    [
      Buffer.from("escrow"),
      maker.publicKey.toBuffer(),
      seed.toArrayLike(Buffer, "le", 8),
    ],
    program.programId
  )[0];

  const vault = getAssociatedTokenAddressSync(
    mintA.publicKey,
    escrow,
    true,
    tokenProgram
  );

  const accounts = {
    maker: maker.publicKey,
    taker: taker.publicKey,
    mintA: mintA.publicKey,
    mintB: mintB.publicKey,
    makerAtaA,
    makerAtaB,
    takerAtaA,
    takerAtaB,
    escrow,
    vault,
    tokenProgram,
  };

  it("Aidrop and create Mints", async () => {
    let lamports = await getMinimumBalanceForRentExemptAccount(connection);
    let tx = new Transaction();
    tx.instructions = [
      ...[maker, taker].map((account) =>
        SystemProgram.transfer({
          fromPubkey: provider.publicKey,
          toPubkey: account.publicKey,
          lamports: 10 * LAMPORTS_PER_SOL,
        })
      ),
      ...[mintA, mintB].map((mint) =>
        SystemProgram.createAccount({
          fromPubkey: provider.publicKey,
          newAccountPubkey: mint.publicKey,
          lamports,
          space: MINT_SIZE,
          programId: tokenProgram,
        })
      ),
      ...[
        { mint: mintA.publicKey, authority: maker.publicKey, ata: makerAtaA },
        { mint: mintB.publicKey, authority: taker.publicKey, ata: takerAtaB },
      ].flatMap((x) => [
        createInitializeMint2Instruction(
          x.mint,
          6,
          x.authority,
          null,
          tokenProgram
        ),
        createAssociatedTokenAccountIdempotentInstruction(
          provider.publicKey,
          x.ata,
          x.authority,
          x.mint,
          tokenProgram
        ),
        createMintToInstruction(
          x.mint,
          x.ata,
          x.authority,
          1e9,
          undefined,
          tokenProgram
        ),
      ]),
    ];
    await provider.sendAndConfirm(tx, [mintA, mintB, maker, taker]).then(log);
  });

  it("Make", async () => {
    try {
      await program.methods
      .make(seed, new BN(1e6), new BN(1e6))
      .accountsPartial({ ...accounts })
      .signers([maker])
      .rpc()
      .then(confirm)
      .then(log);
    } catch (e) {
      console.log(e);
      throw e;
    }

  });

  it("Refund", async () => {
    try {
      await program.methods
      .refund()
      .accountsPartial({ ...accounts })
      .signers([maker])
      .rpc()
      .then(confirm)
      .then(log);
    } catch (e) {
      console.log(e);
      throw e;
    }


  });

  it("Take", async () => {
    try {
      await program.methods
        .take()
        .accountsPartial({ ...accounts })
        .signers([taker])
        .rpc()
        .then(confirm)
        .then(log);
    } catch (e) {
      console.log(e);
      throw e;
    }
  });
});
